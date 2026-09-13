const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {spawn}=require('node:child_process');
test('Advisor suggestions show groups and save only names on desktop and mobile',async()=>{
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3103'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   await page.route('**/rest/v1/**',route=>route.abort());
 await page.route('**/storage/v1/**',route=>route.abort());
 await page.goto('http://localhost:3103');
   const input=page.locator('#customer-advisor'),options=page.locator('#advisors [role=option]');
   await input.focus();
   const directoryLabels=await page.evaluate(()=>ADVISORS.map(a=>a.name+' - '+a.group));
   assert.deepEqual(await options.allTextContents(),directoryLabels);
   await input.fill('Tấn Trung');
   assert.equal((await options.allTextContents()).includes('Tấn Trung'),false);
   await input.fill('Hoa');
   const expected=await page.evaluate(()=>ADVISORS.filter(a=>a.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/\s+/).includes('hoa')).map(a=>a.name+' - '+a.group));
   assert.deepEqual(await options.allTextContents(),expected);
   assert.ok(expected.includes('Nguyễn Thị Hoa - Nha Trang 4'));
   assert.ok(expected.includes('Vương Hoa Dung - Hồng Phát'));
   assert.equal(await options.filter({hasText:/^(Nguyễn Trương Hoàng Anh|Trần Huy Hoàng|Nguyễn Xuân Khoa|Huỳnh Anh Khoa|Hoàng Quyên)( - |$)/}).count(),0);
   await input.fill('  HOA  ');
   assert.deepEqual(await options.allTextContents(),expected);
   await options.filter({hasText:'Nguyễn Thị Hoa - Nha Trang 4'}).click();
   assert.equal(await input.inputValue(),'Nguyễn Thị Hoa');
   await page.locator('#customer-name').fill('Khách kiểm tra TVV');
   await page.locator('#customer-amount').fill('20000000');
   await page.locator('#submit-customer').click();
   const row=page.locator('#presentation-rows tr').filter({hasText:'Khách kiểm tra TVV'});
   assert.equal(await row.locator('td').nth(5).innerText(),'Nguyễn Thị Hoa');
   await page.reload();
   assert.equal(await row.locator('td').nth(5).innerText(),'Nguyễn Thị Hoa');
   await row.locator('[data-edit]').click();
   await input.fill('nguyen thi hoa');
   await input.press('ArrowDown');await input.press('Enter');
   assert.equal(await input.inputValue(),'Nguyễn Thị Hoa');
   assert.equal(await page.locator('#advisors').isVisible(),false);
   assert.equal(await page.locator('#submit-customer').innerText(),'✓ Lưu');
   await input.fill('zzzzzz');assert.equal(await options.count(),0);
   await input.fill('Hoa');await input.press('Escape');
   assert.equal(await input.getAttribute('aria-expanded'),'false');
   await input.fill('Hoa');
   assert.equal(await page.locator('#advisors').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),true);
   await page.screenshot({path:'test-results/advisors-'+viewport.width+'.png',fullPage:true});
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill();}
});

