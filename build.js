const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, {recursive: true});
for (const file of ['index.html', 'style.css', 'app.js', 'cloud.js', 'logo.png']) {
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}
fs.writeFileSync(path.join(output, 'supabase-config.js'), require('./config')());
console.log('Static site built in dist/');
