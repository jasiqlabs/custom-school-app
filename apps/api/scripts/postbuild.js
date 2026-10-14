const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../dist/main.js');
const entry = path.join(__dirname, '../dist/apps/api/src/main.js');

if (target !== entry && fs.existsSync(entry)) {
  fs.writeFileSync(target, "require('./apps/api/src/main.js');\n", 'utf8');
}
