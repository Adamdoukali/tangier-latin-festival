import dns from "dns/promises";

const domains = [
  "tangierlatinfestival.com",
  "www.tangierlatinfestival.com",
  "tickets.tangierlatinfestival.com",
  "admin.tangierlatinfestival.com",
  "partner.tangierlatinfestival.com",
];

console.log("=== DNS DIAGNOSTIC ANALYSIS ===");

for (const d of domains) {
  console.log(`\n--- Inspecting: ${d} ---`);
  try {
    const a = await dns.resolve4(d).catch((e) => `A Error: ${e.message}`);
    console.log("A Records:", a);
  } catch (e) {}

  try {
    const cname = await dns.resolveCname(d).catch((e) => `CNAME Error: ${e.message}`);
    console.log("CNAME Record:", cname);
  } catch (e) {}

  try {
    const ns = await dns.resolveNs(d).catch((e) => `NS Error: ${e.message}`);
    console.log("NS Records:", ns);
  } catch (e) {}
}
