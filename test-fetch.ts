import fs from "fs";
import { execSync } from "child_process";

async function run() {
  const url = "https://raw.githubusercontent.com/ythx-101/x-tweet-fetcher/main/scripts/fetch_tweet.py";
  const res = await fetch(url);
  const text = await res.text();
  fs.writeFileSync("fetch_tweet.py", text);
  
  try {
     const out = execSync("python3 fetch_tweet.py --user ImamU_Admission --limit 5").toString();
     console.log(out);
  } catch(e) {
     console.error(e.output?.toString());
  }
}
run();
