import * as cheerio from 'cheerio';
async function test() {
  const html = await fetch('https://nitter.cz/nitter').then(r=>r.text());
  const $ = cheerio.load(html);
  console.log("HTML Sample:", $('.attachment').slice(0,2).html());
}
test();
