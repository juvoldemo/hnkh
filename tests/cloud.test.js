const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {spawn}=require('node:child_process');

test('Default conference uploads both images and a fresh device can display them',async()=>{
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3104'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  let rows=[];
  const images=new Map();
  async function device(){
   const context=await browser.newContext();
   await context.route('https://supabase.bvntkhanhhoa.asia/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.startsWith('/rest/v1/hn_conferences'))return route.fulfill({json:rows});
    if(url.pathname.includes('/rpc/')){
     const body=request.postDataJSON();
     assert.equal(body.expected_revision,rows[0]?.revision||0);
     rows=[{id:body.conference_id,payload:body.data,revision:(rows[0]?.revision||0)+1}];
     return route.fulfill({json:rows[0].revision});
    }
    const key=url.pathname.split('/conference-images/')[1];
    if(request.method()==='POST'){
     images.set(key,request.postDataBuffer());
     return route.fulfill({json:{Key:key}});
    }
    assert.ok(images.has(key));
    return route.fulfill({contentType:'image/png',body:images.get(key)});
   });
   const page=await context.newPage();await page.goto('http://localhost:3104');
   await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Đã lưu lên Supabase'));
   return page;
  }
  const first=await device();assert.equal(rows.length,0);
  await first.locator('#toggle-tools').click();await first.locator('#edit-conference').click();
  for(const kind of ['background','gift']){
   await first.locator('#'+kind+'-upload').setInputFiles('logo.png');
   await first.locator('#'+kind+'-preview').waitFor({state:'visible'});
  }
  await first.locator('#conference-form button[type=submit]').click();
  await first.locator('#conference-dialog').waitFor({state:'hidden'});
  await first.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Đã lưu lên Supabase'));
  assert.equal(rows.length,1);assert.equal(rows[0].payload.demo,false);assert.equal(images.size,2);
  for(const field of ['backgroundId','giftImageId']){
   assert.match(rows[0].payload[field],/^supabase:shared\//);
   assert.deepEqual(images.get(rows[0].payload[field].slice(9)),require('node:fs').readFileSync('logo.png'));
  }
  const second=await device();
  await second.locator('#toggle-tools').click();await second.locator('#edit-conference').click();
  for(const kind of ['background','gift'])await second.waitForFunction(kind=>{
   const img=document.querySelector('#'+kind+'-preview');return !img.hidden&&img.naturalWidth>0;
  },kind);
 }finally{await browser?.close();server.kill();}
});

test('Supabase: migrate local images, persist customers, reload on another device, preserve conflicts',async()=>{
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3102'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const vm=require('node:vm'),configContext={window:{}};vm.runInNewContext(require('../config')(),configContext);const publicKey=configContext.window.SUPABASE_CONFIG.anonKey;
  const id='22222222-2222-4222-8222-222222222222';
  const conference={id,name:'Cloud conference',date:'2026-09-11',location:'KH',tiers:[],customers:[],backgroundId:'local-image',giftImageId:'local-gift',demo:true};
  let rows=[],uploads=0,conflict=false;
  const context=await browser.newContext();
  await context.route('https://supabase.bvntkhanhhoa.asia/**',async route=>{
   const request=route.request(),url=request.url();
   assert.equal(request.headers().authorization,'Bearer '+publicKey);
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
  const page=await context.newPage();await page.goto('http://localhost:3102');
  assert.equal(await page.locator('#cloud-email,#cloud-password,#cloud-login').count(),0);
  await page.evaluate(async({conference})=>{
   localStorage.setItem('hoi-ngo-conferences-v1',JSON.stringify({active:conference.id,conferences:[conference]}));
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hoi-ngo-background',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
   await new Promise(resolve=>{const tx=db.transaction('images','readwrite');for(const key of ['local-image','local-gift'])tx.objectStore('images').put(new Blob(['test'],{type:'image/png'}),key);tx.oncomplete=resolve;});
  },{conference});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Đã lưu lên Supabase'));
  assert.equal(uploads,2);assert.equal(rows[0].payload.demo,false);assert.match(rows[0].payload.giftImageId,/^supabase:shared\//);assert.match(rows[0].payload.backgroundId,/^supabase:shared\//);
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
