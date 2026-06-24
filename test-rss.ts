async function run() {
    const res = await fetch("https://nitter.cz/ImamU_Admission/rss");
    const xml = await res.text();
    console.log("length:", xml.length);
    console.log(xml.substring(0, 1000));
}
run();
