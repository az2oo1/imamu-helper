import * as cheerio from 'cheerio';
async function test() {
  const html = await fetch('https://nitter.cz/ImamU_Admission').then(r=>r.text());
  const $ = cheerio.load(html);
  
  $('.timeline-item').slice(0, 3).each((i, el) => {
    const dateTitle = $(el).find('.tweet-date a').attr('title');
    const dateText = $(el).find('.tweet-date a').text();
    const video = $(el).find('.tweet-body .attachment video').attr('data-url') || $(el).find('.attachment video source').attr('src') || $(el).find('video').attr('data-url');
    console.log("Date Title:", dateTitle);
    console.log("Date Text:", dateText);
    console.log("Video URL:", video);
  });
}
test();
