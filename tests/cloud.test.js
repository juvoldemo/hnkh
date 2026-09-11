const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {spawn}=require('node:child_process');

test('Supabase: migrate local images, persist customers, reload on another device, preserve conflicts',async()=>{
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3102'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com'};
  const id='22222222-2222-4222-8222-222222222222';
  const conference={id,name:'Cloud conference',date:'2026-09-11',location:'KH',tiers:[],customers:[],backgroundId:'local-image'};
  let rows=[],uploads=0,conflict=false;
  const context=await browser.newContext();
  await context.route('https://supabase.bvntkhanhhoa.asia/**',async route=>{
   const request=route.request(),url=request.url();
   assert.equal(request.headers().authorization,'Bearer test-token');
   if(url.includes('/rest/v1/hn_conferences'))return route.fulfill({json:rows});
   if(url.includes('/storage/v1/object/')){uploads++;return route.fulfill({json:{Key:'image'}});}
   if(url.includes('/rpc/')){
    if(conflict)return route.fulfill({status:409,json:{message:'Conflict'}});
    const body=request.postDataJSON();
    assert.equal(body.expected_revision,rows[0]?.revision||0);
    rows=[{id,payload:body.data,revision:(rows[0]?.revision||0)+1}];
    return route.fulfill({json:rows[0].revision});
   }
   throw Error('Unexpected request '+url);
  });
  await context.addInitScript(({user})=>{sessionStorage.setItem('hoi-ngo-auth',JSON.stringify({user,access_token:'test-token',expires_at:Date.now()/1000+3600}));},{user});
  const page=await context.newPage();await page.goto('http://localhost:3102');
  await page.evaluate(async({conference,user})=>{
   localStorage.setItem('hoi-ngo-conferences-v1:'+user.id,JSON.stringify({active:conference.id,conferences:[conference]}));
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hoi-ngo-background',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
   await new Promise(resolve=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(new Blob(['test'],{type:'image/png'}),'local-image');tx.oncomplete=resolve;});
  },{conference,user});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Đã lưu lên Supabase'));
  assert.equal(uploads,1);assert.match(rows[0].payload.backgroundId,/^supabase:/);
  await page.locator('#customer-name').fill('Nguyễn An');await page.locator('#customer-advisor').fill('TVV');await page.locator('#customer-amount').fill('20000000');await page.locator('#submit-customer').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Đã lưu lên Supabase'));
  assert.equal(rows[0].payload.customers[0].name,'Nguyễn An');
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForFunction(()=>document.querySelector('#presentation-title').textContent==='Cloud conference');
  assert.match(await page.locator('#presentation-rows').innerText(),/Nguyễn An/);
  conflict=true;await page.locator('[data-customer-id]').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Chưa lưu lên Supabase'));
  assert.equal(rows[0].payload.customers[0].giftReceived,undefined);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Chưa lưu lên Supabase'));
  assert.equal(await page.locator('.gift-received').count(),1);
 }finally{await browser?.close();server.kill();}
});
