const fs = require('fs');
const globalCssPath = 'c:/Users/SANJAY GUPTA/Desktop/BMS/Frontend/src/global.css';

let content = fs.readFileSync(globalCssPath, 'utf8');

const additions = `
/* ADDITIONAL GLOBAL LIGHT MODE OVERRIDES */
body.light-mode [style*="background: #0f172a"],
body.light-mode [style*="background: '#0f172a'"],
body.light-mode [style*="backgroundColor: '#0f172a'"],
body.light-mode [style*="backgroundColor: #0f172a"],
body.light-mode [style*="background: #1e293b"],
body.light-mode [style*="background: '#1e293b'"] {
  background-color: var(--scada-card) !important;
  background-image: none !important;
}

body.light-mode [style*="color: #0f172a"],
body.light-mode [style*="color: '#0f172a'"] {
  color: var(--scada-text) !important;
}

/* Linear gradients often hardcoded with dark colors */
body.light-mode [style*="linear-gradient"] {
  background: var(--scada-card) !important;
}
`;

if (!content.includes('ADDITIONAL GLOBAL LIGHT MODE OVERRIDES')) {
  fs.writeFileSync(globalCssPath, content + '\n' + additions);
  console.log('Appended additional light mode overrides to global.css');
} else {
  console.log('Additional overrides already present in global.css');
}
