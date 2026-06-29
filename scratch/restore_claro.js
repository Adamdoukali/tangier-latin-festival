const fs = require('fs');

function restoreClaro() {
  const filePath = 'src/routes/index.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace "Made by The Node Group" with Claro and The Node Group
  content = content.replace(
    '<span>Made by <span className="font-bold">The Node Group</span></span>',
    '<span>Made with love by <a href="https://clarodigi.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition underline decoration-primary/50">Claro</a> & <span className="font-bold">The Node Group</span></span>'
  );

  fs.writeFileSync(filePath, content);
}

restoreClaro();
