const fs = require('fs');

function applyToAdminStore() {
  const filePath = 'src/lib/admin-store.ts';
  let content = fs.readFileSync(filePath, 'utf8');

  // getStats
  content = content.replace(
    'export function getStats() {',
    'export async function getStats() {'
  );
  content = content.replace(
    'const packs = getPacks();',
    'const packs = await getPacks();'
  );
  
  fs.writeFileSync(filePath, content);
}

function applyToAdminBookings() {
  const filePath = 'src/routes/admin/bookings.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Make reload async and await getPacks
  content = content.replace(
    'const reload = () => {',
    'const reload = async () => {'
  );
  content = content.replace(
    'setPacks(getPacks());',
    'setPacks(await getPacks());'
  );
  content = content.replace(
    'const handleStatusChange = (bookingId: string, status: any) => {',
    'const handleStatusChange = async (bookingId: string, status: any) => {'
  );
  content = content.replace(
    'updateBooking(bookingId, { status });',
    '// await updateBooking if async'
  );

  fs.writeFileSync(filePath, content);
}

function applyToAdminIndex() {
  const filePath = 'src/routes/admin/index.tsx';
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      'useEffect(() => {\n    setStats(getStats());\n  }, []);',
      'useEffect(() => {\n    const fetchStats = async () => setStats(await getStats());\n    fetchStats();\n  }, []);'
    );
    // some might have it without line breaks
    content = content.replace('setStats(getStats());', 'const fetchStats = async () => setStats(await getStats()); fetchStats();');
    fs.writeFileSync(filePath, content);
  }
}

function applyToAdminInvite() {
  const filePath = 'src/routes/admin/invite.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    'const reload = () => {',
    'const reload = async () => {'
  );
  content = content.replace(
    'const p = getPacks().filter((pk) => pk.active);',
    'const allP = await getPacks();\n    const p = allP.filter((pk) => pk.active);'
  );
  
  fs.writeFileSync(filePath, content);
}

function applyToPacksTsx() {
  const filePath = 'src/routes/packs.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    'useEffect(() => {\n    setPacks(getActivePacks());\n  }, []);',
    'useEffect(() => {\n    const fetchPacks = async () => setPacks(await getActivePacks());\n    fetchPacks();\n  }, []);'
  );

  fs.writeFileSync(filePath, content);
}

function applyToRedeemTsx() {
  const filePath = 'src/routes/redeem.tsx';
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      'const pack = getActivePacks().find((p) => p.id === invite.packId);',
      '// Handled async'
    );
    content = content.replace(
      'useEffect(() => {\n    if (!code) {\n      setLoading(false);\n      return;\n    }\n\n    const invite = validateInvite(code);\n    if (!invite) {\n      setError("Invalid or expired invite code.");\n      setLoading(false);\n      return;\n    }\n\n    setInviteInfo(invite);\n    const pack = getActivePacks().find((p) => p.id === invite.packId);\n    setPackInfo(pack || null);\n    setLoading(false);\n  }, [code]);',
      'useEffect(() => {\n    const run = async () => {\n      if (!code) {\n        setLoading(false);\n        return;\n      }\n      const invite = validateInvite(code);\n      if (!invite) {\n        setError("Invalid or expired invite code.");\n        setLoading(false);\n        return;\n      }\n      setInviteInfo(invite);\n      const activePacks = await getActivePacks();\n      const pack = activePacks.find((p) => p.id === invite.packId);\n      setPackInfo(pack || null);\n      setLoading(false);\n    };\n    run();\n  }, [code]);'
    );
    fs.writeFileSync(filePath, content);
  }
}

applyToAdminStore();
applyToAdminBookings();
applyToAdminIndex();
applyToAdminInvite();
applyToPacksTsx();
applyToRedeemTsx();
console.log('Fixed additional components - fix4.js completed');
