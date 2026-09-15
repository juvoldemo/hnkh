const configScript = require('../config');

// Keep privileged credentials on the server. Expose only the registration directory.
module.exports = async function advisors(req,res) {
  res.setHeader('Cache-Control','no-store');
  const origin=req.headers?.origin;
  if(origin&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
  }
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');res.writeHead(405);return res.end();
  }
  try{
    const config=configScript({server:true}),advisors=[];
    for(let offset=0;;){
      const query=new URLSearchParams({select:'full_name,advisor_code,group_name',advisor_status:'eq.Hoạt động',order:'id.asc',limit:'1000',offset:String(offset)});
      const response=await fetch(config.url+'/rest/v1/authorized_users?'+query,{headers:{apikey:config.anonKey,Authorization:'Bearer '+config.anonKey},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Directory unavailable');
      const rows=await response.json();
      if(!Array.isArray(rows))throw Error('Invalid directory');
      if(!rows.length)break;
      advisors.push(...rows.filter(row=>row.full_name&&row.advisor_code).map(row=>({name:row.full_name,code:String(row.advisor_code),group:row.group_name||''})));
      offset+=rows.length;
    }
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify(advisors));
  }catch{
    res.writeHead(503,{'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({error:'Chưa tải được danh sách TVV.'}));
  }
};
