import * as cheerio from 'cheerio';
async function test() {
  const html = await fetch('https://nitter.cz/ImamU_Admission').then(r=>r.text());
  const $ = cheerio.load(html);
  console.log("Avatar:", $('.profile-card-avatar img').attr('src'));
  console.log("Tweet link:", $('.tweet-link').first().attr('href'));
}
test();
