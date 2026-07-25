const apiKey = "9c2cec48b13bbf95b4f90648e08a99035f14fa85";
fetch("https://google.serper.dev/news", {
  method: "POST",
  headers: {
    "X-API-KEY": apiKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ q: "grocery FMCG", gl: "in", hl: "en", num: 10 })
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(console.log)
.catch(console.error);
