const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const config=require('../config');

test('Vercel uses a private server key without including it in browser configuration',()=>{
 const previous=process.env.SUPABASE_SERVICE_ROLE_KEY;
 try{
  const key='header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY=key;
  assert.equal(config({server:true}).anonKey,key);
  assert.equal(config().includes(key),false);
  process.env.SUPABASE_SERVICE_ROLE_KEY='invalid';
  assert.throws(()=>config({server:true}),/SUPABASE_SERVICE_ROLE_KEY/);
 }finally{
  if(previous===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY=previous;
 }
});

test('Browser config never includes the privileged server credential',()=>{
 const ctx={window:{}};vm.runInNewContext(config(),ctx);
 const key=ctx.window.SUPABASE_CONFIG.anonKey;
 assert.equal(key.startsWith('sb_secret_'),false);
 if(key.split('.').length===3)assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');
});
