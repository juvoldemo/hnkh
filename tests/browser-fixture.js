// Existing UI fixtures use September 2026 conferences. Keep their editing
// window open and provide a mocked login; collaboration.test.js tests real
// login UI, password headers and date boundaries separately.
exports.preparePage=async page=>{
 await page.addInitScript(()=>{
  sessionStorage.setItem('hn-password','0000');
  const now=Date.now;
  const offset=now()-Date.parse('2026-09-01T00:00:00+07:00');
  Date.now=()=>now()-offset;
 });
 await page.route('**/rest/v1/rpc/hn_role',route=>route.fulfill({json:route.request().headers()['x-conference-password']==='0000'?'user':null}));
};
