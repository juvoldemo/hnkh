const $ = s => document.querySelector(s);
const KEY = Cloud.storageKey;
let cloudReady=false, cloudBusy=false;
const cloudSnapshots=new Map();
const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const number = s => Number(String(s).replace(/\D/g, ''));
const defaults = () => [
  [20, '1.000.000đ + Combo Dù + Bình giữ nhiệt', 1.3],
  [35, '2.500.000đ + Vali Bảo Việt', 3],
  [50, '4.000.000đ + Bình tài lộc Bảo Việt', 6.5],
  [70, '7.000.000đ + Bộ bát ăn 36 món Minh Long', 9.5],
  [100, '10.000.000đ + Bộ bát ăn 36 món Minh Long', 12.5],
  [200, '25.000.000đ + Bộ bát ăn 36 món Minh Long', 27.5],
  [300, '40.000.000đ + Bộ bát ăn 36 món Minh Long', 42.5]
].map(([min, gift, value]) => ({min:min*1e6, gift, value:value*1e6, exclusive:false}));
function demo() {
  const c = {id:uid(),name:'Hội nghị khách hàng · Tháng 09/2026',date:'2026-09-09',location:'Không gian kết nối & thịnh vượng',demo:true,tiers:defaults(),customers:[]};
  c.customers = [ ['Võ Thị Nguyệt',20,'Hoàng Quyên'],['Võ Thị Kim Chinh',25,'Tấn Trung'],['Cù Ngọc Đức',35,'Bích Hằng'],['Nguyễn Thanh Sơn',35,'Hồng Sen'],['Trần Hồng Ân',35,'Nguyễn Thị Quế'],['Hoàng Đức Vĩnh',70,'Hồng Đào'],['Nguyễn Hoài Thu',50,'Hoàng Huyền Trang'],['Lê Thanh Dũng',30,'Minh Thơ'] ].map(([name,amount,advisor],i)=>({id:uid(),name,amount:amount*1e6,advisor,created:Date.now()+i}));
  return {active:c.id,conferences:[c]};
}
function validConference(c) {
  return c && typeof c.name==='string' && c.name.trim() && typeof c.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && !isNaN(new Date(c.date).getTime()) && typeof c.location==='string' && Array.isArray(c.tiers) && c.tiers.every(t=>typeof t.gift==='string' && t.gift.trim() && Number.isSafeInteger(t.min) && t.min>=0 && Number.isSafeInteger(t.value) && t.value>=0 && typeof t.exclusive==='boolean') && new Set(c.tiers.map(t=>t.min)).size===c.tiers.length && Array.isArray(c.customers) && c.customers.every(x=>typeof x.name==='string' && x.name.trim() && typeof x.advisor==='string' && x.advisor.trim() && Number.isSafeInteger(x.amount) && x.amount>0);
}
let state, storageFailed=false;
try {const saved=localStorage.getItem(KEY);state=saved?JSON.parse(saved):demo();if(!Array.isArray(state.conferences)||!state.conferences.length||!state.conferences.every(validConference))throw Error();if(!state.conferences.some(c=>c.id===state.active))state.active=state.conferences[0].id;}catch{state=demo();storageFailed=true;}
$('#toggle-tools').onclick=()=>{
 const button=$('#toggle-tools'),open=button.getAttribute('aria-expanded')!=='true';
 button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Ẩn thanh công cụ':'Hiện thanh công cụ');
 button.title=open?'Ẩn thanh công cụ':'Hiện thanh công cụ';
 $('#conference-tools').inert=!open;
 $('#conference-tools').classList.toggle('is-open',open);
};
const current = () => state.conferences.find(c=>c.id===state.active);
function giftFor(amount, tiers=current().tiers) {return [...tiers].sort((a,b)=>b.min-a.min).find(t=>t.exclusive?amount>t.min:amount>=t.min) || {gift:'Chưa có quà tặng',value:0};}
let editing=null, eventEditing=null, toastTimer, selectedGift='', sortKey='index', sortDirection=1;
const customerCollator=new Intl.Collator('vi',{numeric:true,sensitivity:'base'});
function sortedCustomers(){
 const rows=current().customers.map((customer,index)=>({customer,index:index+1})).filter(({customer:x})=>!selectedGift||giftCategory(giftFor(x.amount).gift)===selectedGift);
 const value=row=>{const x=row.customer;switch(sortKey){case 'index':return row.index;case 'amount':return x.amount;case 'gift':return giftFor(x.amount).gift;case 'value':return giftFor(x.amount).value;default:return x[sortKey];}};
 return rows.sort((a,b)=>{const av=value(a),bv=value(b);return sortDirection*(typeof av==='number'?av-bv:customerCollator.compare(av,bv))||a.index-b.index;});
}
$('#mobile-sort').onchange=e=>{const [key,direction]=e.target.value.split(':');sortKey=key;sortDirection=Number(direction);renderRows();};
function renderSortHeaders(){
 $('#mobile-sort').value=sortKey+':'+sortDirection;
 document.querySelectorAll('[data-sort]').forEach(button=>{
 const active=button.dataset.sort===sortKey;
 button.closest('th').setAttribute('aria-sort',active?(sortDirection===1?'ascending':'descending'):'none');
 button.querySelector('.sort-arrow').textContent=active?(sortDirection===1?'↑':'↓'):'↕';
 button.title='Sắp xếp '+(active&&sortDirection===1?'giảm':'tăng')+' dần';
 });
}
$('.presentation-table thead').onclick=e=>{const button=e.target.closest('[data-sort]');if(!button)return;sortDirection=sortKey===button.dataset.sort?-sortDirection:1;sortKey=button.dataset.sort;renderRows();};
function giftCategory(gift){
 const name=gift.replace(/\d[\d.,]*\s*(?:đ|₫|vnđ|vnd)\s*\+?\s*/gi,'').trim();
 if(/vali/i.test(name))return 'Vali';
 if(/bình tài lộc/i.test(name))return 'Bình tài lộc';
 if(/bộ bát/i.test(name))return 'Bộ bát';
 return name.replace(/bảo việt/gi,'').trim()||'Tiền mặt';
}
function renderGiftFilters(){
 const c=current(),categories=[...new Set([...c.tiers.map(t=>giftCategory(t.gift)),...c.customers.map(x=>giftCategory(giftFor(x.amount).gift))])];
 if(selectedGift&&!categories.includes(selectedGift))selectedGift='';
 $('#gift-filters').innerHTML=['',...categories].map(category=>{
 const count=c.customers.filter(x=>!category||giftCategory(giftFor(x.amount).gift)===category).length;
 return '<button type="button" class="button gift-filter" data-gift-filter="'+esc(category)+'" aria-pressed="'+(selectedGift===category)+'">'+esc(category||'Tất cả')+' <span>'+count+'</span></button>';
 }).join('');
}
$('#gift-filters').onclick=e=>{const b=e.target.closest('[data-gift-filter]');if(b){selectedGift=b.dataset.giftFilter;renderRows();}};
function toggleGiftReceived(row){
 if(!row)return;const x=current().customers.find(x=>x.id===row.dataset.customerId);if(!x)return;
 x.giftReceived=x.giftReceived!==true;
 row.classList.toggle('gift-received',x.giftReceived);
 row.setAttribute('aria-label',x.name+(x.giftReceived?' — Đã tặng quà. Bấm để bỏ đánh dấu.':' — Chưa tặng quà. Bấm để xác nhận đã tặng.'));
 persist();
}
$('#presentation-rows').onkeydown=e=>{if(e.target.matches('tr[data-customer-id]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggleGiftReceived(e.target);}};
function toast(message) {$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3600);}
function persist(){markCloudChanges();try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='Đã lưu trên máy — chờ đồng bộ';if(cloudReady)void syncCloud();return true;}catch{$('#save-status').textContent='Không thể lưu — hãy tải bản sao lưu';toast('Trình duyệt không thể lưu. Hãy sao lưu dữ liệu ngay.');return false;}}
function dateLabel(date){return new Date(date+'T12:00:00').toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});}
function totals(){return current().customers.reduce((s,c)=>({amount:s.amount+c.amount,gifts:s.gifts+giftFor(c.amount).value}),{amount:0,gifts:0});}
function render(){const c=current(),t=totals();$('#presentation-title').textContent=c.name;$('#conference-select').innerHTML=state.conferences.map(e=>`<option value="${esc(e.id)}" ${e.id===c.id?'selected':''}>${esc(e.name)}</option>`).join('');$('#stat-count').innerHTML=fmt(c.customers.length)+' <small>khách hàng</small>';$('#stat-investment').innerHTML=fmt(t.amount)+' <small>VNĐ</small>';$('#stat-gifts').innerHTML=fmt(t.gifts)+' <small>VNĐ</small>';renderRows();preview();}
function renderRows(){renderGiftFilters();renderSortHeaders();const rows=sortedCustomers();$('#presentation-rows').innerHTML=rows.length?rows.map(({customer:x,index},displayIndex)=>{const g=giftFor(x.amount),serial=selectedGift?displayIndex+1:index;return `<tr data-customer-id="${esc(x.id)}" tabindex="0" aria-label="${esc(x.name)}${x.giftReceived===true?' — Đã tặng quà. Bấm để bỏ đánh dấu.':' — Chưa tặng quà. Bấm để xác nhận đã tặng.'}" class="${editing===x.id?'editing-row':''} ${x.giftReceived===true?'gift-received':''}"><td data-label="STT">${serial}</td><td><b class="customer-gradient">${esc(x.name)}</b></td><td class="investment customer-gradient" data-label="Phí đầu tư (VNĐ)">${fmt(x.amount)}</td><td class="gift-cell" data-label="Quà tặng tại hội nghị">${esc(g.gift)}</td><td class="investment gift-value" data-label="Giá trị quà (VNĐ)">${fmt(g.value)}</td><td data-label="Tư vấn viên">${esc(x.advisor)}</td><td><div class="row-actions"><button type="button" data-edit="${esc(x.id)}" aria-label="Sửa ${esc(x.name)}" title="Sửa đăng ký">✎</button><button type="button" data-delete="${esc(x.id)}" aria-label="Xóa ${esc(x.name)}" title="Xóa đăng ký">×</button></div></td></tr>`;}).join(''):`<tr><td colspan="7" class="stage-empty">${selectedGift?'Chưa có khách hàng nhận loại quà này.':'Chào đón đăng ký đầu tiên — nhập thông tin ngay bên dưới.'}</td></tr>`;}
function preview(){const amount=number($('#customer-amount').value),g=amount?giftFor(amount):{gift:'Quà tặng tự động',value:0};$('#preview-gift').textContent=g.gift;$('#preview-value').textContent=fmt(g.value);}
function resetEntry(){editing=null;$('#customer-form').reset();AdvisorPicker.close();$('#submit-customer').textContent='＋ Thêm';$('#entry-index').textContent='＋';$('#cancel-edit').hidden=true;preview();}
$('#customer-amount').addEventListener('input',e=>{const n=number(e.target.value);e.target.value=n?fmt(n):'';preview();});
$('#customer-form').onsubmit=e=>{e.preventDefault();const name=$('#customer-name').value.trim(),advisor=$('#customer-advisor').value.trim(),amount=number($('#customer-amount').value);if(!name||!advisor||!Number.isSafeInteger(amount)||amount<=0||amount>1e15){toast('Vui lòng nhập tên, TVV và phí đầu tư hợp lệ.');return;}const c=current(),wasEditing=!!editing;if(editing){const x=c.customers.find(x=>x.id===editing);if(!x){toast('Đăng ký này đã bị xóa. Vui lòng nhập lại.');resetEntry();render();return;}Object.assign(x,{name,advisor,amount});}else{c.customers.push({id:uid(),name,advisor,amount,created:Date.now()});}const saved=persist();resetEntry();render();if(saved)toast(wasEditing?'Đã cập nhật đăng ký.':'Đã thêm khách hàng.');$('#customer-name').focus();};
$('#cancel-edit').onclick=()=>{resetEntry();renderRows();};
$('#presentation-rows').onclick=e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(!e.target.closest('button,a,input,select,textarea,label'))toggleGiftReceived(e.target.closest('tr[data-customer-id]'));if(edit){const x=current().customers.find(x=>x.id===edit.dataset.edit);editing=x.id;$('#customer-name').value=x.name;$('#customer-amount').value=fmt(x.amount);$('#customer-advisor').value=x.advisor;$('#entry-index').textContent='✎';$('#submit-customer').textContent='✓ Lưu';$('#cancel-edit').hidden=false;preview();renderRows();$('#customer-name').focus();}if(del){const x=current().customers.find(x=>x.id===del.dataset.delete);if(confirm(`Xóa đăng ký của ${x.name}?`)){current().customers=current().customers.filter(c=>c.id!==x.id);if(editing===x.id)resetEntry();persist();render();}}};
$('#conference-select').onchange=e=>{state.active=e.target.value;selectedGift='';resetEntry();persist();render();};

function addTier(t={min:0,gift:'',value:0,exclusive:false}){const row=document.createElement('div');row.className='tier-row';row.innerHTML=`<div class="tier-threshold"><select aria-label="Điều kiện"><option value="inclusive">Từ ≥</option><option value="exclusive" ${t.exclusive?'selected':''}>Trên ></option></select><input class="tier-min" aria-label="Ngưỡng phí đầu tư" inputmode="numeric" required value="${fmt(t.min)}"></div><input class="tier-gift" aria-label="Tên quà tặng" placeholder="Tên quà tặng" required maxlength="300" value="${esc(t.gift)}"><input class="tier-value" aria-label="Giá trị quà tặng" inputmode="numeric" required value="${fmt(t.value)}"><button type="button" aria-label="Xóa mức quà">×</button>`;row.querySelector('button').onclick=()=>row.remove();row.querySelectorAll('.tier-min,.tier-value').forEach(el=>el.oninput=()=>{const n=number(el.value);el.value=el.value?fmt(n):'';});$('#tier-rows').append(row);}
function openConference(edit=false){eventEditing=edit?current().id:null;const c=edit?current():{name:'',date:new Date().toLocaleDateString('en-CA'),location:'',tiers:defaults()};$('#dialog-title').textContent=edit?'Thiết lập hội nghị':'Tạo hội nghị mới';$('#event-name').value=c.name;$('#event-date').value=c.date;$('#event-location').value=c.location;$('#tier-rows').innerHTML='';c.tiers.forEach(addTier);backgroundPresentation.prepare(c);giftPresentation.prepare(c);$('#conference-dialog').showModal();}
$('#create-conference').onclick=()=>openConference();$('#edit-conference').onclick=()=>openConference(true);$('#add-tier').onclick=()=>addTier();
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#conference-form').onsubmit=async e=>{e.preventDefault();const name=$('#event-name').value.trim(),date=$('#event-date').value,location=$('#event-location').value.trim();const tiers=[...document.querySelectorAll('.tier-row')].map(row=>({min:number(row.querySelector('.tier-min').value),gift:row.querySelector('.tier-gift').value.trim(),value:number(row.querySelector('.tier-value').value),exclusive:row.querySelector('select').value==='exclusive'}));const data={name,date,location,tiers,customers:[]};if(!validConference(data)){toast('Kiểm tra tên hội nghị, ngày, quà tặng và các ngưỡng phí. Mỗi ngưỡng phải khác nhau.');return;}tiers.sort((a,b)=>a.min-b.min);let backgroundId,giftImageId;try{backgroundId=await backgroundPresentation.save();giftImageId=await giftPresentation.save();}catch{toast('Không lưu được hình hội nghị. Vui lòng thử lại.');return;}if(eventEditing){Object.assign(state.conferences.find(c=>c.id===eventEditing),{name,date,location,tiers,backgroundId,giftImageId});}else{const c={id:uid(),name,date,location,tiers,backgroundId,giftImageId,customers:[],demo:false};state.conferences.push(c);state.active=c.id;selectedGift='';resetEntry();}const saved=persist();render();$('#conference-dialog').close();if(saved)toast('Đã lưu hội nghị và cập nhật chính sách quà tặng.');};
function download(content,type,filename){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export').onclick=()=>{const c=current(),t=totals();const safe=s=>{const text=String(s);return /^[=+\-@\t\r\n]/.test(text)?"'"+text:text;};const rows=[['Hội nghị',c.name],['Ngày',dateLabel(c.date)],['STT','Khách hàng','Phí đầu tư (VNĐ)','Quà tặng','Giá trị quà (VNĐ)','Tư vấn viên'],...c.customers.map((x,i)=>{const g=giftFor(x.amount);return[i+1,x.name,x.amount,g.gift,g.value,x.advisor];}),['TỔNG',c.customers.length,t.amount,'',t.gifts,'']];download('\ufeff'+rows.map(row=>row.map(x=>'"'+safe(x).replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8',`dang-ky-hoi-nghi-${c.date}.csv`);toast('Đã xuất tệp CSV — mở được bằng Excel.');};
$('#download-backup').onclick=()=>download(JSON.stringify({version:1,conferences:state.conferences},null,2),'application/json',`hoi-ngo-sao-luu-${new Date().toISOString().slice(0,10)}.json`);
$('#register').onclick=async()=>{
 const imageDialog=document.querySelector('#background-dialog[open],#gift-dialog[open]');
 if(imageDialog){imageDialog.dataset.keepFullscreen='true';imageDialog.close();}
 $('#customer-name').scrollIntoView({block:'end',behavior:'smooth'});
 setTimeout(()=>$('#customer-name').focus({preventScroll:true}),250);
};
$('#restore').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20e6)throw Error();const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.conferences)||!data.conferences.length||!data.conferences.every(validConference))throw Error();const imported=data.conferences.map(c=>({...c,id:uid(),demo:false,_cloud:{revision:0,dirty:true},customers:c.customers.map((x,i)=>({...x,id:uid(),created:Number.isFinite(x.created)?x.created:Date.now()+i}))}));state.conferences.push(...imported);state.active=imported[0].id;selectedGift='';const saved=persist();resetEntry();render();$('#backup-dialog').close();if(saved)toast(`Đã khôi phục ${imported.length} hội nghị.`);}catch{toast('Tệp sao lưu không hợp lệ hoặc vượt quá 20 MB.');}e.target.value='';};
$('#present').onclick=async()=>{
 const imageDialog=document.querySelector('#background-dialog[open],#gift-dialog[open]');
 if(imageDialog){try{if(document.fullscreenElement)await document.exitFullscreen();}finally{imageDialog.close();}return;}
 try{
 if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();
}catch{toast('Có thể nhấn F11 để mở toàn màn hình.');}};
const fullscreenEntryDock=document.createElement('div');
fullscreenEntryDock.id='fullscreen-entry-dock';
fullscreenEntryDock.hidden=true;
fullscreenEntryDock.innerHTML='<table><tfoot></tfoot></table>';
$('#customer-form').append(fullscreenEntryDock);
function placeFullscreenEntry(){
 const fullscreen=document.fullscreenElement===document.documentElement;
 const footer=$('.presentation-table tfoot');
 const dockFooter=$('#fullscreen-entry-dock tfoot');
 if(fullscreen&&footer) dockFooter.append(footer);
 else if(!fullscreen&&dockFooter.children.length) $('.presentation-table table').append(dockFooter.firstElementChild);
 fullscreenEntryDock.hidden=!fullscreen;
 $('#present').textContent=fullscreen?'⛶ Thu nhỏ':'⛶ Toàn màn hình';
}
document.addEventListener('fullscreenchange',placeFullscreenEntry);
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{const next=JSON.parse(e.newValue);if(next.conferences?.length&&next.conferences.every(validConference)){const active=state.active;state=next;if(state.conferences.some(c=>c.id===active))state.active=active;render();}}catch{}});
render();if(storageFailed)toast('Không đọc được dữ liệu đã lưu. Đang hiển thị dữ liệu minh họa.');

// Background images are stored separately; each conference references its own image.
const backgroundDB=new Promise((resolve,reject)=>{
 const request=indexedDB.open('hoi-ngo-background',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('images');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
backgroundDB.catch(()=>{});
async function readBackground(key){if(!key)return null;if(key.startsWith('supabase:'))return Cloud.image(key);const db=await backgroundDB;return new Promise((resolve,reject)=>{const r=db.transaction('images').objectStore('images').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function imageUrl(file){const url=URL.createObjectURL(file),probe=new Image();probe.src=url;try{await probe.decode();return url;}catch{URL.revokeObjectURL(url);throw Error('image');}}
// Both presentation buttons use the same upload, storage and fullscreen behavior.
function createImagePresentation(kind,field,label){
const element=suffix=>$('#'+kind+'-'+suffix);
let backgroundUrl='',backgroundOwnsFullscreen=false,backgroundDraft=null,backgroundDraftId=null,previewUrl='',backgroundVersion=0;
let toolsWereOpen=false,toolsWereInert=true;
function showImageTasks(dialog){
 const tools=$('#conference-tools');
 toolsWereOpen=tools.classList.contains('is-open');toolsWereInert=tools.inert;
 dialog.append(tools);tools.classList.add('image-tools');tools.classList.remove('is-open');tools.inert=false;
 const back=$('#close-'+kind);back.setAttribute('aria-expanded','false');
}
function restoreImageTasks(){
 const tools=$('#conference-tools');
 if(!tools.classList.contains('image-tools'))return;
 $('#toggle-tools').after(tools);tools.classList.remove('image-tools');tools.classList.toggle('is-open',toolsWereOpen);tools.inert=toolsWereInert;
}
function updateBackgroundPreview(url){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=url;element('preview').hidden=!url;if(url)element('preview').src=url;else element('preview').removeAttribute('src');}
async function prepareBackground(c){
 const version=++backgroundVersion;backgroundDraft=null;backgroundDraftId=c[field]||null;
 element('upload').value='';updateBackgroundPreview('');element('status').textContent=backgroundDraftId?'Đang tải hình…':'Chưa chọn hình.';
 try{const file=await readBackground(backgroundDraftId);if(version!==backgroundVersion)return;if(file){const url=await imageUrl(file);if(version!==backgroundVersion){URL.revokeObjectURL(url);return;}updateBackgroundPreview(url);element('status').textContent=label+' đã lưu của hội nghị.';}else if(backgroundDraftId)element('status').textContent='Không tìm thấy hình trên thiết bị này. Vui lòng chọn lại.';}catch{if(version===backgroundVersion)element('status').textContent='Không đọc được hình đã lưu. Vui lòng chọn lại.';}
}
async function saveBackgroundDraft(){
 if(!backgroundDraft)return backgroundDraftId;
 const file=backgroundDraft,id=uid(),db=await backgroundDB;
 await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
 return id;
}
element('upload').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;const version=++backgroundVersion;
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>20*1024*1024){toast('Chọn ảnh JPG, PNG, WebP hoặc GIF, tối đa 20 MB.');e.target.value='';return;}
 const submit=$('#conference-form button[type="submit"]');submit.disabled=true;
 try{const url=await imageUrl(file);if(version!==backgroundVersion){URL.revokeObjectURL(url);return;}backgroundDraft=file;updateBackgroundPreview(url);element('status').textContent=file.name+' — Bấm Lưu hội nghị để lưu hình.';}catch{toast('Không đọc được hình. Vui lòng chọn tệp ảnh hợp lệ.');e.target.value='';}finally{submit.disabled=false;}
};
async function openBackground(){
 const dialog=element('dialog');
 // Enter fullscreen first: the dialog must be added to the top layer last.
 if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
  try{await document.documentElement.requestFullscreen();backgroundOwnsFullscreen=true;}catch{backgroundOwnsFullscreen=false;}
 }
 if(!dialog.open)dialog.showModal();
 showImageTasks(dialog);
}
$('#show-'+kind).onclick=async()=>{
 const c=current();if(!c[field]){toast('Hãy thêm '+label+' trong mục Thiết lập & quà tặng.');return;}
 try{const file=await readBackground(c[field]);if(!file)throw Error();const url=await imageUrl(file);if(current().id!==c.id){URL.revokeObjectURL(url);return;}if(backgroundUrl)URL.revokeObjectURL(backgroundUrl);backgroundUrl=url;element('image').src=url;await openBackground();}catch{toast('Không đọc được '+label+'. Hãy chọn lại hình trong Thiết lập & quà tặng.');}
};
$('#close-'+kind).onclick=()=>{
 const tools=$('#conference-tools'),open=!tools.classList.contains('is-open');
 tools.classList.toggle('is-open',open);$('#close-'+kind).setAttribute('aria-expanded',String(open));
};
element('dialog').addEventListener('close',()=>{
 const keepFullscreen=element('dialog').dataset.keepFullscreen==='true';
 delete element('dialog').dataset.keepFullscreen;
 restoreImageTasks();
 if(!keepFullscreen&&backgroundOwnsFullscreen&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 backgroundOwnsFullscreen=false;$('#show-'+kind).focus();
});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&backgroundOwnsFullscreen){backgroundOwnsFullscreen=false;if(element('dialog').open)element('dialog').close();}});
return {prepare:prepareBackground,save:saveBackgroundDraft};
}
const backgroundPresentation=createImagePresentation('background','backgroundId','Background');
const giftPresentation=createImagePresentation('gift','giftImageId','hình Quà');
// Preserve the previously uploaded global background for the active conference.
(async()=>{const c=current();try{if(!c.backgroundId&&await readBackground('current')){c.backgroundId='current';persist();}}catch{}})();

function cloudPayload(c){const {_cloud,...data}=c;return data;}
function markCloudChanges(){
 for(const c of state.conferences){
  const value=JSON.stringify(cloudPayload(c));
  if(cloudSnapshots.get(c.id)!==value){c._cloud={...c._cloud,dirty:true};cloudSnapshots.set(c.id,value);}
 }
}
function cacheCloud(){localStorage.setItem(KEY,JSON.stringify(state));}
async function syncCloud(){
 if(!cloudReady||cloudBusy)return;
 cloudBusy=true;
 $('#save-status').textContent='Đang lưu lên Supabase…';
 try{
  for(const c of state.conferences){
   if(c.demo||!c._cloud?.dirty)continue;
   for(const field of ['backgroundId','giftImageId']){
    const imageId=c[field];
    if(imageId&&!imageId.startsWith('supabase:')){
     const file=await readBackground(imageId);
     if(!file)throw Error('Không tìm thấy ảnh cục bộ. Hãy chọn lại ảnh trong thiết lập hội nghị.');
     const remote=await Cloud.upload(c.id,imageId,file);
     if(c[field]===imageId)c[field]=remote;
    }
   }
   const data=cloudPayload(c),snapshot=JSON.stringify(data);
   const revision=await Cloud.save(data,c._cloud?.revision||0);
   c._cloud={revision,dirty:JSON.stringify(cloudPayload(c))!==snapshot};
   cloudSnapshots.set(c.id,snapshot);
   cacheCloud();
  }
  $('#save-status').textContent=state.conferences.some(c=>!c.demo&&c._cloud?.dirty)?'Đã lưu trên máy — chờ đồng bộ':'Đã lưu lên Supabase lúc '+new Date().toLocaleTimeString('vi-VN');
  $('#cloud-message').textContent='Đã đồng bộ hội nghị, danh sách khách hàng và ảnh.';
 }catch(error){
  $('#save-status').textContent='Chưa lưu lên Supabase — bản cục bộ được giữ lại';
  $('#cloud-message').textContent=error.message;
 }finally{cloudBusy=false;}
}
async function loadCloud(replace=false){
 if(cloudBusy)return;
 cloudReady=false;
 $('#save-status').textContent='Đang tải hội nghị từ Supabase…';
 try{
  const rows=await Cloud.list();
  if(!Array.isArray(rows)||!rows.every(row=>validConference(row.payload)&&row.payload.id===row.id))throw Error('Dữ liệu hội nghị trên máy chủ không hợp lệ.');
  const local=replace?[]:state.conferences.filter(c=>!c.demo);
  for(const row of rows){
   const index=local.findIndex(c=>c.id===row.id);
   const remote={...row.payload,_cloud:{revision:row.revision,dirty:false}};
   if(index<0)local.push(remote);
   else if(!local[index]._cloud?.dirty&&local[index]._cloud?.revision)local[index]=remote;
  }
  if(local.length){state.conferences=local;if(!local.some(c=>c.id===state.active))state.active=local[0].id;}
  else if(replace)state=demo();
  cloudSnapshots.clear();
  for(const c of state.conferences)cloudSnapshots.set(c.id,JSON.stringify(cloudPayload(c)));
  cacheCloud();resetEntry();render();cloudReady=true;
  await syncCloud();
 }catch(error){$('#save-status').textContent='Chưa kết nối Supabase — đang dùng dữ liệu trên máy';$('#cloud-message').textContent=error.message;}
}
$('#cloud-account').onclick=()=>$('#cloud-dialog').showModal();
$('#cloud-sync').onclick=()=>cloudReady?syncCloud():loadCloud();
$('#cloud-reload').onclick=()=>{if(confirm('Thay dữ liệu cục bộ bằng bản trên Supabase? Thay đổi chưa đồng bộ sẽ mất. Hãy tải bản sao lưu trước khi tiếp tục.'))void loadCloud(true);};
// Remember dirty conferences across reloads, including changes made while offline.
for(const c of state.conferences){if(!c._cloud)c._cloud={revision:0,dirty:true};cloudSnapshots.set(c.id,JSON.stringify(cloudPayload(c)));}
void loadCloud();
window.addEventListener('online',()=>cloudReady?syncCloud():loadCloud());
setInterval(()=>{if(!cloudReady||state.conferences.some(c=>!c.demo&&c._cloud?.dirty))void(cloudReady?syncCloud():loadCloud());},15000);
