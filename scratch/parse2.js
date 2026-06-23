const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\Claro\\\\.gemini\\\\antigravity-ide\\\\brain\\\\cddf87ea-9b19-4aec-88fb-0ec6d9cb5557\\\\.system_generated\\\\steps\\\\34\\\\content.md', 'utf8');

// Looking for pairs of image and title
// E.g.: <img ... src="url" ... alt="NAME" ...> and then <h2 class="profile-title"> NAME </h2>

// Or simpler: grab all `div.profile-image-card` and extract img src and h2 title.
const regex = /<div class="profile-image-card[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<h2 class="profile-title">\s*(.*?)\s*<\/h2>/gs;
let match;
console.log("DATA FOUND:");
while ((match = regex.exec(content)) !== null) {
  let img = match[1];
  // Convert standard URLs to just the path if they start with BASE, else keep full URL
  let name = match[2].replace(/&amp;/g, '&').replace(/&#039;/g, "'");
  console.log(name + "|||" + img);
}
