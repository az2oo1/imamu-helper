import * as cheerio from "cheerio";

async function fetchTweetsFromNitter(handle: string) {
    const res = await fetch(`https://nitter.poast.org/${handle}`, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch from nitter: ${res.statusText}`);
    const html = await res.text();
    console.log("HTML length:", html.length);
    console.log("Snippet:", html.substring(0, 200));
    const $ = cheerio.load(html);
    
    const tweets: any[] = [];
    $('.timeline-item').each((i, el) => {
        const isRetweet = $(el).find('.retweet-header').length > 0;
        if (isRetweet) return;

        const content = $(el).find('.tweet-content').text().trim();
        if(!content) return;
        
        let imageUrls: string[] = [];
        $(el).find('.attachment img').each((j, img) => {
            let s = $(img).attr('src');
            if(s) {
                const fixed = decodeURIComponent(s).replace('name=small', 'name=orig').replace('%3Fname%3Dsmall', '%3Fname%3Dorig');
                imageUrls.push("https://nitter.cz" + fixed);
            }
        });
        
        tweets.push({
            content,
            imageUrl: imageUrls.length > 0 ? JSON.stringify(imageUrls) : "",
        });
    });
    console.log(JSON.stringify(tweets, null, 2));
}
fetchTweetsFromNitter('imamu1').catch(console.error);
