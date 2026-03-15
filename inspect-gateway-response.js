const fs = require('fs');
const t = fs.readFileSync('ui-bundle.js', 'utf8');
const idx = t.indexOf('if(n.type===`res`)');
if (idx < 0) {
  console.log('no res');
  process.exit(0);
}
console.log(t.slice(idx - 200, idx + 600).replace(/\n/g, ' '));
