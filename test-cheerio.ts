import * as cheerio from "cheerio";

async function run() {
    console.log("fetching...");
    const res = await fetch("https://nitter.cz/ImamU_Admission");
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const tweets: any[] = [];
    $('.timeline-item').each((i, el) => {
        const content = $(el).find('.tweet-content').text().trim();
        if(!content) return;
        const dateAttr = $(el).find('.tweet-date a').attr('title'); // e.g. "Jul 10, 2023 · 9:15 AM UTC"
        let dateObj = new Date();
        if(dateAttr) {
            dateObj = new Date(dateAttr);
        }
        
        let imageUrl = "";
        const imageSrc = $(el).find('.tweet-body .attachment img').attr('src');
        if(imageSrc) {
            imageUrl = "https://nitter.cz" + imageSrc;
        }
        
        tweets.push({
            content,
            date: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString(),
            imageUrl
        });
    });
    
    console.log(JSON.stringify(tweets, null, 2));
}
run();
