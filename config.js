const fs = require('node:fs');
const path = require('node:path');
module.exports = function configScript() {
  const env = {};
  for (const file of ['.env', '.env.local']) {
    const location = path.join(__dirname, file);
    if (fs.existsSync(location)) for (const line of fs.readFileSync(location, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(NEXT_PUBLIC_SUPABASE_(?:URL|ANON_KEY))\s*=\s*(.*?)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !anonKey) return fs.readFileSync(path.join(__dirname, 'supabase-config.js'), 'utf8');
  if (!url || !anonKey) throw Error('Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (new URL(url).protocol !== 'https:') throw Error('Supabase URL must use HTTPS');
  return 'window.SUPABASE_CONFIG = ' + JSON.stringify({url:url.replace(/\/$/, ''), anonKey}) + ';\n';
};
