const fs = require('node:fs');
const path = require('node:path');
module.exports = function configScript(options = {}) {
  const env = {};
  for (const file of ['.env', '.env.local']) {
    const location = path.join(__dirname, file);
    if (fs.existsSync(location)) for (const line of fs.readFileSync(location, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(NEXT_PUBLIC_SUPABASE_(?:URL|ANON_KEY)|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallbackScript = fs.readFileSync(path.join(__dirname, 'supabase-config.js'), 'utf8');
  const context={window:{}};
  require('node:vm').runInNewContext(fallbackScript,context);
  const fallback=context.window.SUPABASE_CONFIG;
  if(options.server){
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY||anonKey;
    let serverRole;
    try{serverRole=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role;}catch{}
    if(!key||(serverRole!=='service_role'&&!key.startsWith('sb_secret_')))throw Error('Set SUPABASE_SERVICE_ROLE_KEY in the server environment.');
    const serverUrl=url||fallback.url;
    if(new URL(serverUrl).protocol!=='https:')throw Error('Supabase URL must use HTTPS');
    return {url:serverUrl.replace(/\/$/, ''),anonKey:key};
  }
  if (!url && !anonKey) return fallbackScript;
  if (!url || !anonKey) throw Error('Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (new URL(url).protocol !== 'https:') throw Error('Supabase URL must use HTTPS');
  let role;
  try{role=JSON.parse(Buffer.from(anonKey.split('.')[1],'base64url')).role;}catch{}
  if(role==='service_role'||anonKey.startsWith('sb_secret_')){
    if(url.replace(/\/$/, '')!==fallback.url.replace(/\/$/, ''))throw Error('Configure a public Supabase key for the browser.');
    return fallbackScript;
  }
  return 'window.SUPABASE_CONFIG = ' + JSON.stringify({url:url.replace(/\/$/, ''), anonKey}) + ';\n';
};
