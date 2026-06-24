import * as cheerio from 'cheerio';
async function test() {
  const html = await fetch('https://nitter.cz/NASA').then(r=>r.text());
  const $ = cheerio.load(html);
  $('.timeline-item').slice(0, 10).each((i, el) => {
     console.log("Video source", $(el).find('video').attr('data-url') || $(el).find('video source').attr('src') || $(el).find('video').attr('src'));
  });
}
test();
