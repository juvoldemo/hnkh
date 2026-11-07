const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {spawn}=require('node:child_process');
test('password gate, polling, concurrent additions, drafts and closing date',async()=>{
 const key='test.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.test';
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3111',NEXT_PUBLIC_SUPABASE_URL:'https://conference.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:key},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('server exit '+code)));});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  let row={id:'12345678-1234-4234-8234-123456789abc',revision:1,payload:{id:'12345678-1234-4234-8234-123456789abc',name:'Shared conference',date:'2099-11-07',location:'Test',tiers:[],customers:[],demo:false}};
  let conflicts=0,failNextSave=false;
  async function device(){
   const context=await browser.newContext();
   await context.route('https://conference.test/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    const password=req.headers()['x-conference-password'];
    const role=password==='1795'?'admin':password==='0000'?'user':null;
    if(path.endsWith('hn_role'))return route.fulfill({json:role});
    if(!role)return route.fulfill({status:403,json:{}});
    if(path.includes('/rpc/')){
     const data=req.postDataJSON();
     if(failNextSave){failNextSave=false;return route.fulfill({status:503,json:{message:'Temporary outage'}});}
     if(role!=='admin'&&(row.payload.date<'2026-01-01'||data.data.date<'2026-01-01'))return route.fulfill({status:403,json:{message:'Conference is closed'}});
     if(data.expected_revision!==row.revision){conflicts++;return route.fulfill({status:409,json:{}});}
     row={id:row.id,payload:data.data,revision:row.revision+1};
     return route.fulfill({json:row.revision});
    }
    return route.fulfill({json:[row]});
   });
   const page=await context.newPage();await page.goto('http://localhost:3111');return page;
  }
  const a=await device();assert.equal(await a.locator('#presentation').isVisible(),false);
  await a.locator('#login-password').fill('wrong');await a.locator('#login-form button').click();
  await a.waitForFunction(()=>document.querySelector('#login-message').textContent.length>0);
  assert.equal(await a.locator('#presentation').isVisible(),false);
  async function login(page,password='0000'){await page.locator('#login-password').fill(password);await page.locator('#login-form button').click();await page.waitForFunction(()=>typeof state!=='undefined'&&state.conferences[0].name==='Shared conference');}
  await login(a);const b=await device();await login(b);
  assert.equal(await a.locator('#admin-update').isVisible(),false);
  const add=(page,name)=>page.evaluate(name=>{current().customers.push({id:crypto.randomUUID(),name,advisor:'Advisor',amount:100,created:Date.now()});persist();},name);
  await Promise.all([add(a,'Alice'),add(b,'Bob')]);
  await a.waitForFunction(()=>current().customers.length===2);
  await b.waitForFunction(()=>current().customers.length===2);
  assert.deepEqual(row.payload.customers.map(x=>x.name).sort(),['Alice','Bob']);assert.ok(conflicts>=1);
  await b.locator('#customer-name').fill('Draft in progress');
  await add(a,'Carol');await b.waitForFunction(()=>current().customers.length===3);
  assert.equal(await b.locator('#customer-name').inputValue(),'DRAFT IN PROGRESS');
  const checks=await a.evaluate(()=>{
   const original=Date.now;Date.now=()=>Date.parse('2026-11-08T23:59:59+07:00');const before=conferenceClosed({date:'2026-11-07'});
   Date.now=()=>Date.parse('2026-11-09T00:00:00+07:00');const after=conferenceClosed({date:'2026-11-07'});Date.now=original;
   let conflict=false;try{mergeConference({customers:[],name:'a'},{customers:[],name:'b'},{customers:[],name:'c'});}catch{conflict=true;}
   return {before,after,conflict};
  });
  assert.deepEqual(checks,{before:false,after:true,conflict:true});
  row={...row,revision:row.revision+1,payload:{...row.payload,date:'2000-01-01'}};
  await a.waitForFunction(()=>current().date==='2000-01-01');
  const count=row.payload.customers.length;
  await a.locator('#customer-name').fill('Blocked user');await a.locator('#customer-advisor').fill('Advisor');await a.locator('#customer-amount').fill('20');
  await a.locator('#submit-customer').click();
  assert.equal(await a.evaluate(()=>current().customers.length),count);
  const denied=await a.evaluate(async()=>{try{await Cloud.save(cloudPayload(current()),current()._cloud.revision);return false;}catch{return true;}});
  assert.equal(denied,true);assert.equal(row.payload.customers.length,count);
  const admin=await device();await login(admin,'1795');
  assert.equal(await admin.locator('#admin-update').isVisible(),true);
  await admin.setViewportSize({width:375,height:844});
  assert.equal(await admin.locator('#admin-update').isVisible(),true);
  assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await admin.screenshot({path:'test-results/admin-access-mobile.png',fullPage:true});
  await admin.setViewportSize({width:1280,height:900});
  await admin.screenshot({path:'test-results/admin-access-desktop.png',fullPage:true});
  await admin.locator('#customer-name').fill('Late fee');await admin.locator('#customer-advisor').fill('Advisor');await admin.locator('#customer-amount').fill('20');
  await admin.locator('#submit-customer').click();
  await admin.evaluate(async()=>{await loadCloud();await syncCloud();});
  assert.equal(row.payload.customers.length,count);
  await admin.reload();await admin.waitForFunction(()=>loggedIn&&cloudReady);
  assert.equal(await admin.evaluate(()=>current()._cloud.adminDraft),true);
  assert.equal(row.payload.customers.length,count);
  // Simulate another admin update before this draft is submitted: merging must
  // preserve the manual-update authorization through the revision retry.
  row={...row,revision:row.revision+1,payload:{...row.payload,location:'Updated remotely'}};
  await admin.locator('#admin-update').click();
  await admin.waitForFunction(()=>!current()._cloud.dirty);
  assert.equal(row.payload.customers.length,count+1);
  assert.equal(row.payload.customers.at(-1).name,'LATE FEE');
  assert.equal(row.payload.customers.at(-1).amount,20000000);
  assert.equal(row.payload.location,'Updated remotely');
  await b.waitForFunction(count=>current().customers.length===count+1,count);
  assert.equal(await b.locator('#admin-update').isVisible(),false);
  // Clicking Update can submit an uncommitted entry directly as well.
  await admin.locator('#customer-name').fill('Another late fee');await admin.locator('#customer-advisor').fill('Advisor');await admin.locator('#customer-amount').fill('30');
  await admin.locator('#admin-update').click();
  await admin.waitForFunction(()=>!current()._cloud.dirty);
  assert.equal(row.payload.customers.length,count+2);
  await admin.locator('[data-edit]').last().click();await admin.locator('#customer-amount').fill('40');
  await admin.locator('#admin-update').click();await admin.waitForFunction(()=>!current()._cloud.dirty);
  assert.equal(row.payload.customers.length,count+2);
  assert.equal(row.payload.customers.at(-1).amount,40000000);
  failNextSave=true;
  await admin.locator('#customer-name').fill('Retry late fee');await admin.locator('#customer-advisor').fill('Advisor');await admin.locator('#customer-amount').fill('50');
  await admin.locator('#admin-update').click();
  await admin.waitForFunction(()=>document.querySelector('#save-status').textContent.startsWith('Chưa lưu lên Supabase'));
  assert.equal(row.payload.customers.length,count+2);
  await admin.evaluate(async()=>{await loadCloud();await syncCloud();});
  assert.equal(row.payload.customers.length,count+2);
  assert.equal(await admin.evaluate(()=>current()._cloud.adminDraft),true);
  await admin.locator('#admin-update').click();await admin.waitForFunction(()=>!current()._cloud.dirty);
  assert.equal(row.payload.customers.length,count+3);
 }finally{await browser?.close();server.kill();}
});
