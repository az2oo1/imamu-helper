import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url')?.trim();

    if (!rawUrl || (!rawUrl.includes('chat.whatsapp.com') && !rawUrl.includes('wa.me'))) {
      return NextResponse.json({ error: "Invalid WhatsApp URL" }, { status: 400 });
    }

    const resp = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "Could not fetch WhatsApp link" }, { status: 404 });
    }

    const html = await resp.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogMatch && ogMatch[1]) {
      const imageUrl = ogMatch[1].replace(/&amp;/g, '&');
      const imageResp = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (imageResp.ok) {
        const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imageResp.arrayBuffer();
        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    }

    return NextResponse.json({ error: "No group image found" }, { status: 404 });
  } catch (err) {
    console.error("Error fetching WhatsApp avatar:", err);
    return NextResponse.json({ error: "Failed to load WhatsApp avatar" }, { status: 500 });
  }
}
