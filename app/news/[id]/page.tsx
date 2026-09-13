import type { Metadata } from 'next';
import { getDb } from '../../../src/db/index';
import { news } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';
import ArticleDetailClient from './ArticleDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);

  if (isNaN(numId)) {
    return {
      title: 'المقال غير موجود | مساعد الإمام',
    };
  }

  try {
    const db = await getDb();
    const [item] = await db.select().from(news).where(eq(news.id, numId)).limit(1);

    if (!item) {
      return {
        title: 'المقال غير موجود | مساعد الإمام',
      };
    }

    const title = item.title || 'خبر جامعي';
    const cleanContent = item.content ? item.content.replace(/<[^>]*>/g, '').trim() : '';
    const description = item.excerpt || cleanContent.slice(0, 160) || 'تفاصيل الخبر الأكاديمي والطلابي على منصة مساعد الإمام';
    const image = item.imageUrl || '/logo_light.png';

    return {
      title: `${title} | أخبار الإمام`,
      description,
      openGraph: {
        title: `${title} | مساعد الإمام`,
        description,
        url: `/news/${id}`,
        type: 'article',
        images: [
          {
            url: image,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | مساعد الإمام`,
        description,
        images: [image],
      },
    };
  } catch (_e) {
    return {
      title: 'أخبار جامعة الإمام | مساعد الإمام',
    };
  }
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numId = Number(id);
  let initialArticle: any = null;

  if (!isNaN(numId)) {
    try {
      const db = await getDb();
      const [item] = await db.select().from(news).where(eq(news.id, numId)).limit(1);
      if (item) {
        initialArticle = item;
      }
    } catch (_e) {}
  }

  return <ArticleDetailClient articleId={id} initialArticle={initialArticle} />;
}
