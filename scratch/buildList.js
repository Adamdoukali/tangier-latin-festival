const fs = require('fs');

const extracted = `
SANDRINE|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-228-2.png
ALICIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-235.png
TALAL|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-229.png
ABDEL ZOUK|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-232.png
ADIL & ELO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-233.png
EDU & SILVANA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-237.png
MALICK & CARLA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-234.png
VANESKA LOPEZ|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-236.png
MERVIL|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-238-2.png
CYRA'S TEAM|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-242.png
ASIER & ALEKSANDRA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-239.png
JESUS & MARIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-243.png
ANDY & SARAY|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-240.png
JOSE PABLO & CYNTIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-244.png
JUANMA & TANIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-245.png
Cebo & Emmanuelle|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Cebo-Emmanuelle.jpg
JUNIOR|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-251.png
KAL & AURORE|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-252.png
JJ PACHANGA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-247.png
MANU & ELENA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-255.png
KECO & MONICA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-248.png
ROBERT & ANGELA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-253.png
MAMBO FAMILY|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-250.png
MARIO & LIDIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-254.png
OLEG & ISA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-256.png
MEREMBÉ|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-260.png
TONI & ALICIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-259.png
ALBERTO & MARTA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-263.png
RAFA & SHEILA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-257.png
ABDEL & HOUDS|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/08/ABDEL-HOUDS.png
PEDRO & MARIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-258.png
Athéna|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Athena.jpg
Manu & Olivia|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Manu-Olivia-scaled.jpg
FRANCIS, DULCE & FRANCIS JR|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Francis-Dulce-e1753134778111.jpg
CIA WOMEN REVOLUTION|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/10/CIA-Women-Revolution-1.jpg
HAJAR POCAHONTAS|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-268.png
DIEGO & LIDIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Diego-Lidia-e1753134809562.jpg
NICKY & SOFIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/10/Nicky-Sofia.jpg
AHMEDY & CARO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-264.png
Fabz|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Fabz.jpg
QUIJANO BROTHERS|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/10/Quijano-Brothers.jpg
JUANEN & JEZABEL|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-270.png
JORIS & SOFIA|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Joris-Sofia.jpg
JORDI & SARA|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/10/Jordi-Sara.png
MARCELO & MARIBEL|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-272.png
Omar & Pamela|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Omar-Pamela.jpg
Fanny Mujica|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Fanny-Mujica.jpg
MOROWA DANCE|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-275.png
ABIR|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-279.png
Coello & Alba|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Coello-Alba.jpg
IVAN & CORAL|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-273.png
RUBEN Y BLANCA|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/image-277.png
Oscar Rodriguez & Sophia|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Oscar-Rodriguez-Sophia.jpg
YASMINE|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/IMG_6842-e1753134853717.jpg
Rodri & Elena|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Rodri-Elena-e1753135099695.jpg
Armando & Erika|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/Armando-Erika.jpg
DJ W|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/DJ-ABDELO.jpg
DJ KECO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-KECO.png
DJ BAD|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-BAD.png
DJ MISTER T|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-MISTER-T.png
DJ EL MAESTRO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-EL-MAESTRO.png
DJ MYSTER YOUSS|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-MYSTER-YOUSS.png
DJ KITO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-KITO.png
DJ NMK|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-NMK.png
DJ TEMAZO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-TEMAZO.png
Dj Puto X|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Dj-Puto-X-scaled.jpg
DJ YOUSS|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-YOUSS.png
DJ JALS|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-JALS.png
DJs Nene & Sandy|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DJ-NENE-SANDY.png
Fika Dance Crew|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Fika-Dance-Crew.jpg
LATIN DANCE EVOLUTION|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/LATIN-DANCE-EVOLUTION.png
YES WE DANCE AMATEUR BY ANDY & SARAY|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/YES-WE-DANCE-AMATEUR-BY-ANDY-SARAY.png
TUMBALA LADIES|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/TUMBALA-LADIES.png
EVOLADIES SALSA BY VANESKA LOPEZ|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/EVOLADIES-SALSA-BY-VANESKA-LOPEZ.png
GINADANCE ACADEMY URBAN DANCE|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/GINADANCE-ACADEMY-URBAN-DANCE.png
Shaonda Ladies|||https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Shaonda-Ladies.jpg
WAFA’S SECRET TEAM|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WAFAS-SECRET-TEAM.png
MURCIA MAMBOCOMPANY|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/MURCIA-MAMBOCOMPANY.png
B.MAMBO|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/B.MAMBO_.png
JAFE TEAM|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/JAFE-TEAM.png
PEDRO Y MARÍA JOSÉ SCHOOL|||https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/PEDRO-Y-MARIA-JOSE-SCHOOL.png
`;

const mappings = {
  "SANDRINE": "Kizomba",
  "ALICIA": "Bachata",
  "MERVIL": "Kizomba",
  "JOSE PABLO & CYNTIA": "Bachata",
  "JUANMA & TANIA": "Bachata",
  "KAL & AURORE": "Bachata",
  "KECO & MONICA": "Kizomba",
  "MAMBO FAMILY": "Salsa",
  "MARIO & LIDIA": "Bachata",
  "MEREMBÉ": "Salsa",
  "ABDEL & HOUDS": "Salsa",
  "PEDRO & MARIA": "Bachata",
  "MANU & OLIVIA": "Bachata",
  "HAJAR POCAHONTAS": "Salsa",
  "AHMEDY & CARO": "Bachata",
  "JUANEN & JEZABEL": "Bachata",
  "FRANCIS, DULCE & FRANCIS JR": "Salsa",
  "DIEGO & LIDIA": "Bachata",
  "FABZ": "Kizomba",
  "JORIS & SOFIA": "Bachata",
  "CIA WOMEN REVOLUTION": "Bachata",
  "NICKY & SOFIA": "Bachata",
  "QUIJANO BROTHERS": "Salsa",
  "JORDI & SARA": "Bachata",
  "MARCELO & MARIBEL": "Salsa",
  "MOROWA DANCE": "Salsa",
  "IVAN & CORAL": "Bachata",
  "YASMINE": "Salsa",
  "OMAR & PAMELA": "Bachata",
  "ABIR": "Salsa",
  "RUBEN Y BLANCA": "Bachata",
  "RODRI & ELENA": "Kizomba",
  "FANNY MUJICA": "Salsa",
  "COELLO & ALBA": "Bachata",
  "OSCAR RODRIGUEZ & SOPHIA": "Salsa",
  "ARMANDO & ERIKA": "Bachata",
};

// Existing styles (fallback):
const existingStyles = {
  "TALAL": "Salsa",
  "VANESKA LOPEZ": "Salsa",
  "JUNIOR": "Bachata",
  "ANDY & SARAY": "Bachata",
  "ABDEL ZOUK": "Zouk",
  "ADIL & ELO": "Bachata",
  "EDU & SILVANA": "Bachata",
  "MALICK & CARLA": "Kizomba",
  "CYRA'S TEAM": "Salsa",
  "ASIER & ALEKSANDRA": "Bachata",
  "JESUS & MARIA": "Bachata",
  "CEBO & EMMANUELLE": "Kizomba",
  "JJ PACHANGA": "Salsa",
  "MANU & ELENA": "Salsa",
  "ROBERT & ANGELA": "Bachata",
  "OLEG & ISA": "Bachata",
  "TONI & ALICIA": "Bachata",
  "ALBERTO & MARTA": "Bachata",
  "RAFA & SHEILA": "Salsa",
  "ATHÉNA": "Kizomba"
};

const isDJ = (name) => name.toUpperCase().startsWith("DJ") || name.toUpperCase().includes(" DJ ");
const isSchool = (name) => {
  const upper = name.toUpperCase();
  return upper.includes("DANCE") || upper.includes("TEAM") || upper.includes("ACADEMY") || upper.includes("SCHOOL") || upper.includes("LADIES") || upper.includes("COMPANY") || upper.includes("B.MAMBO");
};

let output = `const ALL_ARTISTS = [\n`;
extracted.trim().split('\\n').forEach(line => {
  if(!line.trim()) return;
  const [name, img] = line.split('|||');
  let style = "Salsa"; // default
  
  const upperName = name.toUpperCase();
  if (mappings[upperName]) {
    style = mappings[upperName];
  } else if (existingStyles[upperName]) {
    style = existingStyles[upperName];
  } else if (isDJ(name)) {
    style = "DJ";
  } else if (isSchool(name)) {
    style = "School";
  }

  // Optimize img URL
  let finalImg = `"${img}"`;
  if (img.startsWith("https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/")) {
    finalImg = `BASE + "${img.replace("https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/", "")}"`;
  } else if (img.startsWith("https://www.tangierlatinfestival.com/wp-content/uploads/2025/")) {
    finalImg = `BASE25 + "${img.replace("https://www.tangierlatinfestival.com/wp-content/uploads/2025/", "")}"`;
  } else if (img.startsWith("https://www.tangierlatinfestival.com/wp-content/uploads/2024/")) {
    finalImg = `BASE24 + "${img.replace("https://www.tangierlatinfestival.com/wp-content/uploads/2024/", "")}"`;
  }

  // A couple imported images like Junior and Talal
  if (upperName === "TALAL") finalImg = "a1";
  if (upperName === "VANESKA LOPEZ") finalImg = "a2";
  if (upperName === "JUNIOR") finalImg = "a3";
  if (upperName === "ANDY & SARAY") finalImg = "a4";

  output += `  { name: "${name.replace(/"/g, '\\"')}", style: "${style}", img: ${finalImg} },\n`;
});
output += `];\n`;

fs.writeFileSync('C:\\\\Users\\\\Claro\\\\Documents\\\\tangier-latin-festival\\\\scratch\\\\out.js', output);
console.log("DONE");
