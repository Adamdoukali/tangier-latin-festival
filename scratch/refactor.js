const fs = require('fs');
const path = require('path');

const ADMIN_PACKS = 'src/routes/admin/packs.tsx';
const ADMIN_INVITE = 'src/routes/admin/invite.tsx';
const ADMIN_BOOKINGS = 'src/routes/admin/bookings.tsx';
const PACKS = 'src/routes/packs.tsx';
const INDEX = 'src/routes/index.tsx';

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content);
}

// 1. admin/packs.tsx
replaceInFile(ADMIN_PACKS, [
    [/const reload = \(\) => setPacks\(getPacks\(\)\);/g, 'const reload = async () => setPacks(await getPacks());'],
    [/updatePack\(editingId, \{ \.\.\.form, features: cleanFeatures \}\);/g, 'await updatePack(editingId, { ...form, features: cleanFeatures });'],
    [/addPack\(\{ \.\.\.form, features: cleanFeatures \}\);/g, 'await addPack({ ...form, features: cleanFeatures });'],
    [/const handleSave = \(\) => \{/g, 'const handleSave = async () => {'],
    [/deletePack\(id\);/g, 'await deletePack(id);'],
    [/const handleDelete = \(id: string\) => \{/g, 'const handleDelete = async (id: string) => {'],
    [/updatePack\(pack.id, \{ active: !pack.active \}\);/g, 'await updatePack(pack.id, { active: !pack.active });'],
    [/const toggleActive = \(pack: Pack\) => \{/g, 'const toggleActive = async (pack: Pack) => {'],
    [/updatePack\(pack.id, \{ popular: !pack.popular \}\);/g, 'await updatePack(pack.id, { popular: !pack.popular });'],
    [/const togglePopular = \(pack: Pack\) => \{/g, 'const togglePopular = async (pack: Pack) => {']
]);

// 2. admin/bookings.tsx
replaceInFile(ADMIN_BOOKINGS, [
    [/const reload = \(\) => \{/g, 'const reload = async () => {'],
    [/setPacks\(getPacks\(\)\);/g, 'setPacks(await getPacks());'],
    [/setBookings\(getBookings\(\)\);/g, 'setBookings(await getBookings());'],
    [/updateBooking\(bookingId, \{ status \}\);/g, 'await updateBooking(bookingId, { status });'],
    [/const handleStatusChange = \(bookingId: string, status: any\) => \{/g, 'const handleStatusChange = async (bookingId: string, status: any) => {'],
    [/deleteBooking\(id\);/g, 'await deleteBooking(id);'],
    [/const handleDelete = \(id: string\) => \{/g, 'const handleDelete = async (id: string) => {']
]);

// 3. admin/invite.tsx
replaceInFile(ADMIN_INVITE, [
    [/const reload = \(\) => \{/g, 'const reload = async () => {'],
    [/setInvites\(getInvites\(\)\);/g, 'setInvites(await getInvites());'],
    [/const p = getPacks\(\).filter\(\(pk\) => pk.active\);/g, 'const allP = await getPacks();\n    const p = allP.filter((pk) => pk.active);'],
    [/addInvite\(\{/g, 'await addInvite({'],
    [/const handleSave = \(\) => \{/g, 'const handleSave = async () => {'],
    [/deleteInvite\(id\);/g, 'await deleteInvite(id);'],
    [/const handleDelete = \(id: string\) => \{/g, 'const handleDelete = async (id: string) => {']
]);

// 4. packs.tsx
replaceInFile(PACKS, [
    [/setPacks\(getActivePacks\(\)\);/g, 'const fetchPacks = async () => setPacks(await getActivePacks()); fetchPacks();'],
]);

// 5. index.tsx
replaceInFile(INDEX, [
    [/const adminPacks = getActivePacks\(\);/g, 'const fetchPacks = async () => { const adminPacks = await getActivePacks(); if (adminPacks.length > 0) { setDynamicPacks(adminPacks.map(p => ({ ...p, name: p.name, desc: p.sub, price: p.price, features: p.features }))); } }; fetchPacks();'],
    [/if \(adminPacks.length > 0\) \{/g, '// if'],
    [/setDynamicPacks\(/g, '// setDynamicPacks('],
    [/adminPacks.map\(\(p\) => \(\{/g, '// adminPacks.map((p) => ({'],
    [/\.\.\.p,/g, '// ...p,'],
    [/name: p.name,/g, '// name: p.name,'],
    [/desc: p.sub,/g, '// desc: p.sub,'],
    [/price: p.price,/g, '// price: p.price,'],
    [/features: p.features,/g, '// features: p.features,'],
    [/\}\)\)/g, '// }))'],
    [/\);/g, '// );'],
    [/\}/g, '}']
]);

console.log('Refactoring complete');
