const fs = require('fs');
const t = fs.readFileSync('ui-bundle.js', 'utf8');
const idx = t.indexOf('method:');
if (idx < 0) {
  console.log('no method');
  process.exit(0);
}
console.log(t.slice(idx - 120, idx + 220).replace(/\n/g, ' '));
