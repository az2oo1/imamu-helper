async function run() {
    const res = await fetch("https://nitter.cz/ImamU_Admission");
    const html = await res.text();
    console.log("length:", html.length);
    console.log(html.substring(0, 500));
}
run();
