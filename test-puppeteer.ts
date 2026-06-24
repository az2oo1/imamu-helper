import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";

puppeteerExtra.use(StealthPlugin());

async function fetchTweets() {
    console.log("launching");
    const browser = await puppeteerExtra.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 1024 },
        executablePath: await chromium.executablePath(),
        headless: true,
    });
    
    const page = await browser.newPage();
    const handle = "ImamU_Admission";
    console.log("Navigating...");
    await page.goto(`https://x.com/${handle}`, { waitUntil: "networkidle2" });
    await page.waitForTimeout(3000);
    const content = await page.content();
    console.log(content.substring(0, 300));
    const tweets = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="tweet"]')).map((el) => {
            const textElement = el.querySelector('[data-testid="tweetText"]');
            const timeElement = el.querySelector('time');
            const imageElement = el.querySelector('img[src*="media"]');
            
            return {
                content: textElement ? textElement.textContent : "",
                date: timeElement ? timeElement.getAttribute("datetime") : new Date().toISOString(),
                imageUrl: imageElement ? imageElement.getAttribute("src") : ""
            };
        }).filter(t => t.content && t.content.length > 0);
    });
    
    console.log("TWEETS:", tweets);
    await browser.close();
}

fetchTweets().catch(console.error);
