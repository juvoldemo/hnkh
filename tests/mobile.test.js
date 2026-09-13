const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {spawn}=require('node:child_process');

test('Mobile cards, touch controls, sorting and dialogs fit narrow screens',async()=>{
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3101'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.route('**/rest/v1/**',route=>route.abort());
 await page.route('**/storage/v1/**',route=>route.abort());
 await page.goto('http://localhost:3101');
  for(const width of [320,375,390,430,600,768,900]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Page fits ${width}px`);
   assert.equal(await page.locator('.presentation-table').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Cards fit ${width}px`);
   assert.equal(await page.locator('#customer-name').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),true);
   await page.locator('#toggle-tools').click();
   for(const id of ['conference-select','create-conference','edit-conference','export','register','show-background','show-gift','present']){
    const box=await page.locator('#'+id).boundingBox();
    assert.ok(box.x>=0&&box.x+box.width<=width&&box.height>=44,`${id} fits ${width}px`);
   }
   await page.locator('#edit-conference').click();
   assert.equal(await page.locator('#conference-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Dialog fits ${width}px`);
   await page.locator('#conference-dialog .close-dialog').first().click();
   await page.locator('#toggle-tools').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobile-sort').selectOption('amount:-1');
  assert.equal(await page.locator('#presentation-rows tr').first().locator('td').nth(2).innerText(),'70.000.000');
  await page.locator('#customer-name').fill('Khách hàng có họ và tên rất dài để kiểm tra xuống dòng trên điện thoại');
  await page.locator('#customer-amount').fill('999999999999999');
  await page.locator('#customer-advisor').fill('Tư vấn viên có họ và tên dài');
  await page.locator('#submit-customer').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const card=page.locator('#presentation-rows tr').first();
  await card.locator('[data-edit]').click();
  await page.locator('#customer-amount').fill('80000000');
  await page.locator('#submit-customer').click();
  await card.locator('td').nth(1).click();
  assert.ok(await card.evaluate(el=>el.classList.contains('gift-received')));
  await page.locator('#toggle-tools').click();
  await page.locator('#backup-dialog').evaluate(dialog=>dialog.showModal());
  assert.equal(await page.locator('#backup-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.locator('#backup-dialog .close-dialog').click();
  await page.locator('#toggle-tools').click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/mobile-responsive.png'});
  await page.setViewportSize({width:844,height:390});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#customer-name').fill('Kiểm tra khi màn hình thấp');
  await page.locator('#customer-advisor').fill('Tư vấn viên');
  await page.locator('#customer-amount').fill('20000000');
  await page.locator('#submit-customer').click();
 }finally{if(browser)await browser.close();server.kill();}
});
