import * as cheerio from 'cheerio';
async function test() {
  const html = await fetch('https://nitter.cz/NASA').then(r=>r.text());
  const $ = cheerio.load(html);
  const v = $('.timeline-item:has(video)').first();
  console.log("Video HTML:", v.find('.attachment').html());
}
test();
