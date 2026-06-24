const NITTERS = [
    "https://nitter.poast.org",
    "https://nitter.privacydev.net",
    "https://nitter.cz",
    "https://nitter.net",
    "https://nitter.unixfox.eu",
    "https://nitter.1d4.us",
    "https://xcancel.com"
];

async function checkNitters() {
    const handle = "ImamU_Admission";
    for (const n of NITTERS) {
        try {
            const res = await fetch(`${n}/${handle}`, { timeout: 3000 } as any);
            console.log(n, res.status);
            if (res.status === 200) {
               const html = await res.text();
               if(html.includes("timeline-item")) console.log("Works!");
            }
        } catch(e) {
            console.log(n, "failed");
        }
    }
}
checkNitters();
