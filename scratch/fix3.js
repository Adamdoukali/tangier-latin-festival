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
  
  // deletePack wait, already async? Let's check deletePack in admin-store.ts
  // yes it is async. But let's make sure.
  
  fs.writeFileSync(filePath, content);
}

function applyToAdminBookings() {
  const filePath = 'src/routes/admin/bookings.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(
    'const reload = () => {',
    'const reload = async () => {'
  );
  content = content.replace(
    'setPacks(getPacks());',
    'setPacks(await getPacks());'
  );
  content = content.replace(
    'setBookings(getBookings());',
    'setBookings(getBookings()); // if getBookings is not async yet, keep it, but getBookings might be async? Wait, no, only packs is async right now.'
  );

  fs.writeFileSync(filePath, content);
}

function applyToAdminInvite() {
  const filePath = 'src/routes/admin/invite.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    'const reload = () => {',
    'const reload = async () => {'
  );
  content = content.replace(
    'setInvites(getInvites());',
    'setInvites(getInvites());'
  );
  content = content.replace(
    'const p = getPacks().filter((pk) => pk.active);',
    'const p = (await getPacks()).filter((pk) => pk.active);'
  );
  
  fs.writeFileSync(filePath, content);
}

function applyToPacksTsx() {
  const filePath = 'src/routes/packs.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add translations and make fetch async
  if (!content.includes('const translateDynamic =')) {
    content = content.replace(
      'const { t } = useLanguage();',
      `const { lang, t } = useLanguage();

  const translateDynamic = (text: string) => {
    const dict: Record<string, { en: string; fr: string; es: string }> = {
      "chambre double": { en: "Double Room", fr: "Chambre Double", es: "Habitación Doble" },
      "chambre single": { en: "Single Room", fr: "Chambre Simple", es: "Habitación Individual" },
      "full pass": { en: "Full Pass", fr: "Full Pass", es: "Full Pass" },
      "basic ticket": { en: "Basic Ticket", fr: "Billet Basique", es: "Entrada Básica" },
      "couple pass": { en: "Couple Pass", fr: "Pass Couple", es: "Pase Pareja" },
      "party pass": { en: "Party Pass", fr: "Pass Soirée", es: "Pase Fiesta" },
      "day pass": { en: "Day Pass", fr: "Pass Journée", es: "Pase de Día" },
      "solazur hotel tangier (2 nights)": { en: "SOLAZUR HOTEL TANGIER (2 NIGHTS)", fr: "HÔTEL SOLAZUR TANGER (2 NUITS)", es: "HOTEL SOLAZUR TÁNGER (2 NOCHES)" },
      "solazur hotel tangier (3 nights)": { en: "SOLAZUR HOTEL TANGIER (3 NIGHTS)", fr: "HÔTEL SOLAZUR TANGER (3 NUITS)", es: "HOTEL SOLAZUR TÁNGER (3 NOCHES)" },
      "solazur hotel tangier (4 nights)": { en: "SOLAZUR HOTEL TANGIER (4 NIGHTS)", fr: "HÔTEL SOLAZUR TANGER (4 NUITS)", es: "HOTEL SOLAZUR TÁNGER (4 NOCHES)" },
      "without accommodation": { en: "WITHOUT ACCOMMODATION", fr: "SANS HÉBERGEMENT", es: "SIN ALOJAMIENTO" },
      "2 nights": { en: "2 NIGHTS", fr: "2 NUITS", es: "2 NOCHES" },
      "3 nights": { en: "3 NIGHTS", fr: "3 NUITS", es: "3 NOCHES" },
      "4 nights": { en: "4 NIGHTS", fr: "4 NUITS", es: "4 NOCHES" },
      "breakfast": { en: "BREAKFAST", fr: "PETIT-DÉJEUNER", es: "DESAYUNO" },
      "dinner": { en: "DINNER", fr: "DÎNER", es: "CENA" },
      "all workshops": { en: "ALL WORKSHOPS", fr: "TOUS LES WORKSHOPS", es: "TODOS LOS TALLERES" },
      "shows": { en: "SHOWS", fr: "SHOWS", es: "SHOWS" },
      "social parties": { en: "SOCIAL PARTIES", fr: "SOIRÉES SOCIALES", es: "FIESTAS SOCIALES" },
      "pool parties": { en: "POOL PARTIES", fr: "POOL PARTIES", es: "POOL PARTIES" },
      "1 leader + 1 follower": { en: "1 LEADER + 1 FOLLOWER", fr: "1 LEADER + 1 FOLLOWER", es: "1 LEADER + 1 FOLLOWER" },
      "shows & parties": { en: "SHOWS & PARTIES", fr: "SHOWS & SOIRÉES", es: "SHOWS & FIESTAS" },
      "(no workshops)": { en: "(NO WORKSHOPS)", fr: "(SANS WORKSHOPS)", es: "(SIN TALLERES)" },
      "pool parties (1 day only)": { en: "POOL PARTIES (1 DAY ONLY)", fr: "POOL PARTIES (1 JOUR SEULEMENT)", es: "POOL PARTIES (SOLO 1 DÍA)" }
    };
    const key = text.trim().toLowerCase();
    return dict[key]?.[lang as "en" | "fr" | "es"] || text;
  };`
    );
  }

  content = content.replace(
    '  useEffect(() => {\n    setPacks(getActivePacks());\n  }, []);',
    '  useEffect(() => {\n    const fetchPacks = async () => setPacks(await getActivePacks());\n    fetchPacks();\n  }, []);'
  );

  // Layout changes
  content = content.replace(
    '<div className="text-center mb-16">',
    '<div className="text-left mb-16">'
  );
  content = content.replace(
    '{category}',
    '{translateDynamic(category)}'
  );
  content = content.replace(
    '<div className="h-1 w-24 bg-gold mx-auto mt-6 rounded-full" />',
    '<div className="h-1 w-24 bg-gold mt-6 rounded-full" />'
  );
  content = content.replace(
    '<div className="relative z-10 flex flex-col flex-1">',
    '<div className="relative z-10 flex flex-col flex-1 text-left">'
  );
  content = content.replace(
    '{p.name}',
    '{translateDynamic(p.name)}'
  );
  content = content.replace(
    '{p.sub}',
    '{translateDynamic(p.sub)}'
  );
  content = content.replace(
    '<ul className="space-y-4 md:space-y-5 flex-1">',
    '<ul className="mt-8 md:mt-10 space-y-4 md:space-y-5 flex-1 text-left">'
  );
  content = content.replace(
    '{p.features.map((f: string) => (',
    '{p.features.map((f: string, i: number) => ('
  );
  content = content.replace(
    'key={f}',
    'key={i}'
  );
  content = content.replace(
    '{f}',
    '{translateDynamic(f)}'
  );
  
  fs.writeFileSync(filePath, content);
}


applyToAdminStore();
applyToAdminBookings();
applyToAdminInvite();
applyToPacksTsx();
console.log('Fixed additional components');
