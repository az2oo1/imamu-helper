async function run() {
  try {
    const res = await fetch("http://0.0.0.0:3000/api/admin/news_sources");
    console.log(res.status);
    console.log(await res.text());
  } catch(e) {
    console.log(e);
  }
}
run();
