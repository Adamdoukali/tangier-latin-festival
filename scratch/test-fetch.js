const urls = [
  "http://tangierlatinfestival.com",
  "https://tangierlatinfestival.com",
  "https://www.tangierlatinfestival.com",
  "https://tickets.tangierlatinfestival.com",
  "https://admin.tangierlatinfestival.com",
  "https://partner.tangierlatinfestival.com"
];

for (const u of urls) {
  try {
    const res = await fetch(u, { redirect: "manual" });
    console.log(u, "=> Status:", res.status, "Location:", res.headers.get("location") || "(none)");
  } catch (err) {
    console.log(u, "=> ERROR:", err.message);
  }
}
