import { eq, or, inArray } from 'drizzle-orm';
import { news, news_sources, activity_logs } from '../../db/schema';
import { logger } from '../../middleware/logger';
import { downloadAndUploadToStorage } from '../../lib/storage';

/**
 * Clean Telegram Channel Handle or URL:
 * Handles formats like:
 * - "https://t.me/s/IMAMU_NEWS"
 * - "https://t.me/IMAMU_NEWS"
 * - "t.me/IMAMU_NEWS"
 * - "@IMAMU_NEWS"
 * - "IMAMU_NEWS"
 */
export function cleanTelegramHandle(input?: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '');
  cleaned = cleaned.replace(/^t\.me\/(s\/)?/i, '');
  cleaned = cleaned.replace(/^@/, '');
  cleaned = cleaned.replace(/\/.*$/, ''); // Strip subpaths
  cleaned = cleaned.replace(/\?.*$/, ''); // Strip query params
  return cleaned.trim();
}

export function unescapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, anchor) => {
      const cleanAnchor = anchor.replace(/<[^>]+>/g, '').trim();
      // Remove query parameters like ?q=%23... attached to telegram hashtags or search URLs
      if (cleanAnchor.startsWith('#') || cleanAnchor.startsWith('@') || href.includes('?q=') || href.startsWith('tg://')) {
        return cleanAnchor;
      }
      if (cleanAnchor === href || href.includes(cleanAnchor)) return cleanAnchor;
      return `[${cleanAnchor}](${href})`;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&rlm;/gi, '')
    .replace(/&lrm;/gi, '')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .replace(/\s*\(\?q=[^)]+\)/gi, '')
    .replace(/\s*\(\?q=%23[^)]+\)/gi, '')
    .replace(/\s*\?q=%23[^\s)]+/gi, '')
    .trim();
}

export interface ExtractedTelegramPost {
  msgId: string;
  tweetId: string;
  postUrl: string;
  text: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  datetime: string;
  date: string;
}

export async function extractTelegramChannelPosts(
  channelInput: string,
  limit: number = 30,
  db: any
) {
  const channelHandle = cleanTelegramHandle(channelInput);
  if (!channelHandle) {
    throw new Error('الرجاء إدخال اسم أو رابط قناة تليقرام صحيح');
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const headers = {
    'User-Agent': userAgent,
    'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  let channelTitle = channelHandle;
  let channelAvatarUrl: any = null;
  const rawPostsMap = new Map<string, ExtractedTelegramPost>();

  const parseHtmlPage = (html: string) => {
    // Extract Channel Title
    if (channelTitle === channelHandle) {
      const titleMatch = html.match(/<div[^>]+class=["'][^"']*tgme_channel_info_header_title[^"']*["'][^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/<div[^>]+class=["']tgme_header_title["'][^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      if (titleMatch && titleMatch[1]) {
        channelTitle = unescapeHtml(titleMatch[1].trim());
      }
    }

    // Extract Channel Avatar
    if (!channelAvatarUrl) {
      const avatarMatch = html.match(/<img[^>]+class=["'][^"']*tgme_page_photo_image[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
                          html.match(/<img[^>]+class=["'][^"']*tgme_header_thumb_img[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (avatarMatch && avatarMatch[1]) {
        channelAvatarUrl = avatarMatch[1].replace(/&amp;/g, '&');
      }
    }

    // Split HTML by message widget containers
    const messageBlocks = html.split(/<div[^>]+class=["'][^"']*tgme_widget_message\b[^"']*["']/i).slice(1);
    
    for (const block of messageBlocks) {
      const postMatch = block.match(/data-post=["']([^"']+)["']/i);
      const postPath = postMatch ? postMatch[1] : null;
      const msgIdMatch = postPath ? postPath.split('/')[1] : null;

      if (!msgIdMatch) continue;

      const tweetId = `tg_${channelHandle}_${msgIdMatch}`;
      if (rawPostsMap.has(tweetId)) continue;

      // Extract Text
      const textMatch = block.match(/<div[^>]+class=["'][^"']*tgme_widget_message_text\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      const rawTextHtml = textMatch ? textMatch[1] : '';
      const cleanText = unescapeHtml(rawTextHtml);

      // Extract Photo URL
      const photoMatch = block.match(/background-image:\s*url\(['"]([^'"]+)['"]\)/i) ||
                         block.match(/<img[^>]+class=["']tgme_widget_message_photo[^"']*["'][^>]+src=["']([^"']+)["']/i);
      const photoUrl = photoMatch ? photoMatch[1].replace(/&amp;/g, '&') : null;

      // Extract Video URL
      const videoMatch = block.match(/<video[^>]+src=["']([^"']+)["']/i) ||
                         block.match(/<a[^>]+class=["'][^"']*tgme_widget_message_video_player[^"']*["'][^>]+href=["']([^"']+)["']/i);
      const videoUrl = videoMatch ? videoMatch[1].replace(/&amp;/g, '&') : null;

      // Extract Date
      const timeMatch = block.match(/<time[^>]+datetime=["']([^"']+)["']/i);
      const datetime = timeMatch ? timeMatch[1] : new Date().toISOString();
      const date = datetime.split('T')[0];

      if (cleanText || photoUrl || videoUrl) {
        rawPostsMap.set(tweetId, {
          msgId: msgIdMatch,
          tweetId,
          postUrl: `https://t.me/${channelHandle}/${msgIdMatch}`,
          text: cleanText,
          photoUrl,
          videoUrl,
          datetime,
          date
        });
      }
    }
  };

  // Fetch Page 1 (Latest 20 messages)
  const firstUrl = `https://t.me/s/${encodeURIComponent(channelHandle)}`;
  const resp1 = await fetch(firstUrl, { headers });
  if (!resp1.ok) {
    throw new Error(`تعذر الوصول لقناة التليقرام t.me/s/${channelHandle} (Status ${resp1.status})`);
  }
  const html1 = await resp1.text();
  parseHtmlPage(html1);

  // If we need up to 30 posts and fetched fewer, fetch Page 2 via ?before=smallestMsgId
  if (rawPostsMap.size < limit && rawPostsMap.size > 0) {
    const msgIds = Array.from(rawPostsMap.values())
      .map(p => Number(p.msgId))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    
    const smallestMsgId = msgIds[0];
    if (smallestMsgId && smallestMsgId > 1) {
      try {
        const page2Url = `https://t.me/s/${encodeURIComponent(channelHandle)}?before=${smallestMsgId}`;
        const resp2 = await fetch(page2Url, { headers });
        if (resp2.ok) {
          const html2 = await resp2.text();
          parseHtmlPage(html2);
        }
      } catch (err) {
        logger.error(`Error fetching page 2 for telegram channel ${channelHandle}:`, err);
      }
    }
  }

  const allPostsList = Array.from(rawPostsMap.values())
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    .slice(0, limit);

  if (allPostsList.length === 0) {
    throw new Error(`لم يتم العثور على أي منشورات عامة في قناة التليقرام @${channelHandle}. يرجى التأكد من أن القناة عامة وليست خاصة.`);
  }

  // Store channel avatar locally so browser loads it smoothly without telesco.pe CORS/CSP issues
  let finalChannelAvatarUrl: string | null = (channelAvatarUrl as string | null) || null;
  const avatarUrlStr = typeof channelAvatarUrl === 'string' ? channelAvatarUrl : '';
  if (avatarUrlStr && (avatarUrlStr.startsWith('http://') || avatarUrlStr.startsWith('https://'))) {
    try {
      const stored = await downloadAndUploadToStorage(avatarUrlStr, 'tg_avatar');
      if (stored) finalChannelAvatarUrl = stored;
    } catch (e) {
      console.warn('[Telegram Avatar Download Error]', e);
    }
  }

  // 1. Insert/Update channel source in news_sources
  const existingSource = await db.select().from(news_sources).where(
    or(eq(news_sources.handle, channelHandle), eq(news_sources.handle, `@${channelHandle}`))
  );

  if (existingSource.length > 0) {
    await db.update(news_sources).set({
      handle: channelHandle,
      profilePicUrl: finalChannelAvatarUrl || existingSource[0].profilePicUrl,
      lastFetched: new Date(),
      isActive: true
    }).where(eq(news_sources.id, existingSource[0].id));
  } else {
    await db.insert(news_sources).values({
      handle: channelHandle,
      profilePicUrl: finalChannelAvatarUrl,
      isActive: true,
      lastFetched: new Date()
    });
  }

  // 2. Query existing tweetIds to avoid duplicates
  const tweetIds = allPostsList.map(p => p.tweetId);
  const existingNews = tweetIds.length > 0
    ? await db.select({ tweetId: news.tweetId }).from(news).where(inArray(news.tweetId, tweetIds)).catch(() => [])
    : [];

  const existingTweetIdSet = new Set(existingNews.map((n: any) => n.tweetId));
  const newPostsToInsert = allPostsList.filter(p => !existingTweetIdSet.has(p.tweetId));

  let insertedCount = 0;
  for (const post of newPostsToInsert) {
    const postContent = post.text || (post.photoUrl ? '[صورة من التليقرام]' : '[منشور من التليقرام]');
    const finalPhotoUrl = post.photoUrl || null;

    await db.insert(news).values({
      content: postContent,
      source: channelHandle,
      authorName: channelTitle || channelHandle,
      authorHandle: `@${channelHandle}`,
      authorAvatar: finalChannelAvatarUrl,
      imageUrl: finalPhotoUrl,
      videoUrl: post.videoUrl || null,
      date: post.date,
      tweetId: post.tweetId,
      createdAt: new Date(post.datetime)
    });
    insertedCount++;
  }


  // Log activity
  try {
    await db.insert(activity_logs).values({
      level: 'info',
      category: 'TELEGRAM_EXTRACT',
      action: 'extract_channel',
      message: `تم استخراج ${allPostsList.length} منشور ورفع ${insertedCount} منشور جديد من قناة التليقرام @${channelHandle}`,
      metadata: JSON.stringify({ channelHandle, total: allPostsList.length, inserted: insertedCount })
    });
  } catch (e) {}

  return {
    success: true,
    channelHandle,
    channelTitle: channelTitle || channelHandle,
    channelAvatar: channelAvatarUrl || null,
    totalExtracted: allPostsList.length,
    newPublished: insertedCount,
    posts: allPostsList
  };
}
