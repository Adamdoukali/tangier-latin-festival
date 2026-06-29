const fs = require('fs');

let redeemPath = 'src/routes/redeem.tsx';
let redeem = fs.readFileSync(redeemPath, 'utf8');

if (!redeem.includes('getFlagEmoji')) {
  redeem = redeem.replace(
    /import \{ useState, useEffect \} from "react";/,
    'import { useState, useEffect } from "react";\nimport { countries, getFlagEmoji } from "@/lib/countries";'
  );
}

// Replace Phone & Country
redeem = redeem.replace(
  /\{\/\* Phone & Country \*\/\}.*?<\/div>\s*<\/div>/s,
  `{/* Phone & Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Phone
                </label>
                <div className="flex">
                  <select
                    name="phone_country"
                    defaultValue={\`\${getFlagEmoji("MA")} +212\`}
                    className="rounded-l-lg border border-zinc-700/60 border-r-0 bg-zinc-800/50 px-2 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition max-w-[110px]"
                    onChange={(e) => {
                       // Just update form.phone or a new field if needed
                    }}
                  >
                    {countries.map(c => {
                      const flag = getFlagEmoji(c.code);
                      return (
                        <option key={c.code} value={\`\${flag} \${c.dial_code}\`}>
                          {flag} {c.dial_code} ({c.code})
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Number"
                    className="w-full rounded-r-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Morocco"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>
            </div>`
);

fs.writeFileSync(redeemPath, redeem);
