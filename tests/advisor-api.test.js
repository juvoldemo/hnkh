const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const config=require('../config');
const handler=require('../api/advisors');

test('Browser config never includes the privileged server credential',()=>{
 const ctx={window:{}};vm.runInNewContext(config(),ctx);
 const key=ctx.window.SUPABASE_CONFIG.anonKey;
 assert.equal(key.startsWith('sb_secret_'),false);
 if(key.split('.').length===3)assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');
});

test('Advisor endpoint filters active users, paginates and exposes only registration fields',async()=>{
 const originalFetch=global.fetch;let calls=0,status,body;
 global.fetch=async(url,options)=>{
  const query=new URL(url).searchParams;
  assert.equal(query.get('advisor_status'),'eq.Hoạt động');
  assert.equal(query.get('select'),'full_name,advisor_code,group_name');
  assert.equal(query.get('offset'),String(calls++));
  assert.ok(options.headers.apikey);
  return {ok:true,json:async()=>calls===1?[{full_name:'Thang Thị Bích Hằng',advisor_code:'TEST',group_name:'Hoàng Phát',password_hash:'must not be returned'}]:[]};
 };
 try{
  await handler({method:'GET'},{setHeader(){},writeHead(value){status=value;},end(value){body=value;}});
  assert.equal(status,200);assert.equal(calls,2);
  assert.deepEqual(JSON.parse(body),[{name:'Thang Thị Bích Hằng',code:'TEST',group:'Hoàng Phát'}]);
 }finally{global.fetch=originalFetch;}
});
