const fs = require('fs');

const file = 'src/lib/admin-store.ts';
let content = fs.readFileSync(file, 'utf8');

content = `import { supabase } from "./supabase";\n` + content;

// Replace getPacks
content = content.replace(
  `export function getPacks(): Pack[] {
  seedIfNeeded();
  return readStore<Pack>(PACKS_KEY);
}`,
  `export async function getPacks(): Promise<Pack[]> {
  if (supabase) {
    const { data, error } = await supabase.from('packs').select('*');
    if (!error && data) return data;
  }
  seedIfNeeded();
  return readStore<Pack>(PACKS_KEY);
}`
);

// Replace getActivePacks
content = content.replace(
  `export function getActivePacks(): Pack[] {
  return getPacks().filter((p) => p.active);
}`,
  `export async function getActivePacks(): Promise<Pack[]> {
  if (supabase) {
    const { data, error } = await supabase.from('packs').select('*').eq('active', true);
    if (!error && data) return data;
  }
  const packs = await getPacks();
  return packs.filter((p) => p.active);
}`
);

// Replace getPackById
content = content.replace(
  `export function getPackById(id: string): Pack | undefined {
  return getPacks().find((p) => p.id === id);
}`,
  `export async function getPackById(id: string): Promise<Pack | undefined> {
  if (supabase) {
    const { data, error } = await supabase.from('packs').select('*').eq('id', id).single();
    if (!error && data) return data;
  }
  const packs = await getPacks();
  return packs.find((p) => p.id === id);
}`
);

// Replace addPack
content = content.replace(
  `export function addPack(
  pack: Omit<Pack, "id" | "createdAt">
): Pack {
  const packs = getPacks();
  const newPack: Pack = {
    ...pack,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  packs.push(newPack);
  writeStore(PACKS_KEY, packs);
  return newPack;
}`,
  `export async function addPack(pack: Omit<Pack, "id" | "createdAt">): Promise<Pack> {
  if (supabase) {
    const { data, error } = await supabase.from('packs').insert(pack).select().single();
    if (!error && data) return data;
  }
  const packs = await getPacks();
  const newPack: Pack = {
    ...pack,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  packs.push(newPack);
  writeStore(PACKS_KEY, packs);
  return newPack;
}`
);

// Replace updatePack
content = content.replace(
  `export function updatePack(
  id: string,
  updates: Partial<Omit<Pack, "id" | "createdAt">>
): Pack | null {
  const packs = getPacks();
  const idx = packs.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  packs[idx] = { ...packs[idx], ...updates };
  writeStore(PACKS_KEY, packs);
  return packs[idx];
}`,
  `export async function updatePack(id: string, updates: Partial<Omit<Pack, "id" | "createdAt">>): Promise<Pack | null> {
  if (supabase) {
    const { data, error } = await supabase.from('packs').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }
  const packs = await getPacks();
  const idx = packs.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  packs[idx] = { ...packs[idx], ...updates };
  writeStore(PACKS_KEY, packs);
  return packs[idx];
}`
);

// Replace deletePack
content = content.replace(
  `export function deletePack(id: string): boolean {
  const packs = getPacks();
  const filtered = packs.filter((p) => p.id !== id);
  if (filtered.length === packs.length) return false;
  writeStore(PACKS_KEY, filtered);
  return true;
}`,
  `export async function deletePack(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('packs').delete().eq('id', id);
    if (!error) return true;
  }
  const packs = await getPacks();
  const filtered = packs.filter((p) => p.id !== id);
  if (filtered.length === packs.length) return false;
  writeStore(PACKS_KEY, filtered);
  return true;
}`
);

fs.writeFileSync(file, content);
console.log('Modified admin-store.ts packs CRUD');
