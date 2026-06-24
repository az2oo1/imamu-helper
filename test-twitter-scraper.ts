async function test() {
  const url = `https://api.vxtwitter.com/ImamU_Admission`;
  const res = await fetch(url);
  const html = await res.text();
  console.log(res.status, html);
}
test();
