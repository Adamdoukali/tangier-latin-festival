const fs = require('fs');
let content = fs.readFileSync('src/routes/gallery.tsx', 'utf8');
content = content.replace(/category: "shows-samedi"/g, 'category: "saturday-shows"');
content = content.replace(/category: "shows-vendredi"/g, 'category: "friday-shows"');
fs.writeFileSync('src/routes/gallery.tsx', content);
console.log('Replaced categories successfully!');
