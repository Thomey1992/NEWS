window.NEMS_READY.then(D=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const norm=s=>(s??'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const esc=s=>(s??'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function parseDate(v){
  if(!v||v==='N/A') return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)){let [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d);}
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(v)){let [d,m,y]=v.split('/').map(Number);return new Date(y,m-1,d);}
  let x=new Date(v); return isNaN(x)?null:x;
}
function fmtDate(v){let d=parseDate(v);return d?d.toLocaleDateString('vi-VN'):(v||'—')}
function dayDiff(v){let d=parseDate(v);if(!d)return null;let now=new Date();now.setHours(0,0,0,0);return Math.ceil((d-now)/86400000)}
function dueStatus(v){
  let n=dayDiff(v);if(n===null)return {t:'Chưa có dữ liệu',c:'nodata'};
  if(n<0)return {t:`Quá hạn ${Math.abs(n)} ngày`,c:'overdue'};
  if(n<=60)return {t:`Còn ${n} ngày`,c:'due-soon'};
  return {t:`Còn ${n} ngày`,c:'ok'};
}
function isApproved(e){return !!(e.approver||'').trim()}
function statusHTML(e){return isApproved(e)?'<span class="status approved">Đã duyệt<br>Approved</span>':'<span class="status pending">Chờ duyệt<br>Pending</span>'}
function cleanType(t){return (t||'').replace(/[🔴🟤🟠🟣🔷🔶🟢⚪⚫🟡🟧🟦🟩]/g,'').replace(/\s+/g,' ').trim()}
function sortedEvents(arr=D.events){return [...arr].sort((a,b)=>(parseDate(b.date)?.getTime()||0)-(parseDate(a.date)?.getTime()||0)||Number(b.id||0)-Number(a.id||0))}
const eventByAsset=new Map();
function rebuildEventIndex(){eventByAsset.clear();sortedEvents().forEach(e=>{if(!e.asset)return;if(!eventByAsset.has(e.asset))eventByAsset.set(e.asset,[]);eventByAsset.get(e.asset).push(e)})}
rebuildEventIndex();

function setView(id,push=true){
  $$('.view').forEach(v=>v.classList.add('hidden'));let target=$('#'+id);if(target)target.classList.remove('hidden');
  $$('.nav-btn,.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  if(push&&id!=='detail') history.pushState({},'',location.pathname+'#'+id);
  $('.sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');

function dashboard(){
  const approved=D.events.filter(isApproved).length,pending=D.events.length-approved;
  const insp=D.equipment.filter(e=>parseDate(e.accreditation));
  const cal=D.equipment.filter(e=>parseDate(e.calibration));
  const inspDue=insp.filter(e=>{let n=dayDiff(e.accreditation);return n!==null&&n>=0&&n<=60}).length;
  const calDue=cal.filter(e=>{let n=dayDiff(e.calibration);return n!==null&&n>=0&&n<=60}).length;
  $('#kEquipment').textContent=D.equipment.length;$('#kApproved').textContent=approved;$('#kPending').textContent=pending;
  $('#kInspection').textContent=inspDue;$('#kCalibration').textContent=calDue;$('#dueInspection').textContent=inspDue;$('#dueCalibration').textContent=calDue;

  $('#recentHistory').innerHTML=sortedEvents().slice(0,7).map((e,i)=>`<tr class="clickable" data-asset="${esc(e.asset)}"><td>${i+1}</td><td><b>${fmtDate(e.date)}</b></td><td>${esc(cleanType(e.eventType))}</td><td>${esc(e.description)}</td><td>${esc(e.technician||'—')}</td><td>${statusHTML(e)}</td></tr>`).join('');
  bindAssetRows('#recentHistory');

  renderMini('#inspectionMini',insp,'accreditation');
  renderMini('#calibrationMini',cal,'calibration');
}
function renderMini(sel,rows,field){
  let a=[...rows].filter(e=>{let n=dayDiff(e[field]);return n!==null&&n>=0&&n<=60}).sort((x,y)=>parseDate(x[field])-parseDate(y[field]));
  $(sel).innerHTML=a.length?a.map((e,i)=>{let s=dueStatus(e[field]);return `<div class="mini-row clickable" data-asset="${esc(e.asset)}"><div class="mini-no">${i+1}</div><div><b>${esc(e.name||e.assetName)}</b><br><span>${esc(e.asset)}</span></div><div>${fmtDate(e[field])}</div><div><span class="status ${s.c}">${s.t}</span></div></div>`}).join(''):'<div class="mini-empty">Không có thiết bị đến hạn trong 60 ngày.<br>No equipment due within 60 days.</div>';
  bindAssetRows(sel);
}

const areaSel=$('#areaFilter');
[...new Set(D.equipment.map(x=>x.position).filter(Boolean))].sort().forEach(x=>areaSel.add(new Option(x,x)));
function renderEquipment(){
 let q=norm($('#equipmentSearch').value),a=areaSel.value;
 let rows=D.equipment.filter(e=>(!a||e.position===a)&&(!q||norm([e.asset,e.name,e.assetName,e.model,e.serial,e.position].join(' ')).includes(q)));
 $('#equipmentCount').textContent=rows.length+' thiết bị / equipment';
 $('#equipmentBody').innerHTML=rows.map((e,i)=>`<tr class="clickable" data-asset="${esc(e.asset)}"><td>${i+1}</td><td><b>${esc(e.asset)}</b></td><td>${esc(e.name||e.assetName)}</td><td>${esc(e.model||'—')}</td><td>${esc(e.serial||'—')}</td><td>${esc(e.position||'—')}</td><td>${(eventByAsset.get(e.asset)||[]).length}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Không tìm thấy thiết bị.</td></tr>';
 bindAssetRows('#equipmentBody');
}
$('#equipmentSearch').oninput=renderEquipment;areaSel.onchange=renderEquipment;

function renderHistory(){
 let q=norm($('#historySearch').value),s=$('#historyStatus').value;
 let rows=sortedEvents().filter(e=>(!s||(s==='approved'?isApproved(e):!isApproved(e)))&&(!q||norm([e.asset,e.name,e.eventType,e.description,e.technician,e.result].join(' ')).includes(q)));
 $('#historyCount').textContent=rows.length+' bản ghi / records';
 $('#historyBody').innerHTML=rows.map((e,i)=>`<tr ${e.asset?`class="clickable" data-asset="${esc(e.asset)}"`:''}><td>${i+1}</td><td><b>${fmtDate(e.date)}</b></td><td>${esc(e.asset||'—')}</td><td>${esc(e.area||'—')}</td><td>${esc(e.name||e.assetName||'—')}</td><td>${esc(e.model||'—')}</td><td>${esc(e.serial||'—')}</td><td>${esc(cleanType(e.eventType))}</td><td class="wrap-text">${esc(e.description||'—')}</td><td class="wrap-text">${esc(e.cause||'—')}</td><td class="wrap-text">${esc(e.result||'—')}</td><td>${esc(e.downtime||'—')}</td><td class="wrap-text">${esc(e.note||'—')}</td><td>${esc(e.technician||'—')}</td><td>${esc(e.approver||'—')}</td><td>${statusHTML(e)}</td></tr>`).join('')||'<tr><td colspan="16" class="empty">Không có dữ liệu.</td></tr>';
 bindAssetRows('#historyBody');
}
$('#historySearch').oninput=renderHistory;$('#historyStatus').onchange=renderHistory;

function dueTable(type){
 const field=type==='inspection'?'accreditation':'calibration',body=$('#'+type+'Body'),search=norm($('#'+type+'Search').value);
 let rows=D.equipment.filter(e=>parseDate(e[field])&&(!search||norm([e.asset,e.name,e.assetName,e.model,e.position].join(' ')).includes(search))).sort((a,b)=>parseDate(a[field])-parseDate(b[field]));
 body.innerHTML=rows.length?rows.map((e,i)=>{let s=dueStatus(e[field]);let n=dayDiff(e[field]);return `<tr class="clickable" data-asset="${esc(e.asset)}"><td>${i+1}</td><td><b>${esc(e.name||e.assetName)}</b></td><td>${esc(e.asset)}</td><td>${esc(e.position||'—')}</td><td>${fmtDate(e[field])}</td><td>${n===null?'—':(n<0?`${Math.abs(n)} ngày quá hạn`:`${n} ngày`)}</td><td><span class="status ${s.c}">${s.t}</span></td></tr>`}).join(''):`<tr><td colspan="7" class="empty">${type==='calibration'?'Hiện file Excel chưa có ngày hiệu chuẩn hợp lệ.':'Không có dữ liệu kiểm định.'}</td></tr>`;
 bindAssetRows('#'+type+'Body');
}
$('#inspectionSearch').oninput=()=>dueTable('inspection');$('#calibrationSearch').oninput=()=>dueTable('calibration');


function isMaintenancePlanned(e){
 const c=norm(e.maintenanceCycle||'');
 return !!c && c!=='n/a' && c!=='na' && !c.includes('khong');
}
function cycleMonths(value){
 const m=String(value||'').match(/(\d+)\s*(?:tháng|thang|month)/i);
 return m?Number(m[1]):null;
}
function addMonths(date,months){
 if(!date||!months)return null;
 const d=new Date(date.getFullYear(),date.getMonth()+months,date.getDate());
 return d;
}
function latestPmDate(asset){
 const rows=(eventByAsset.get(asset)||[]).filter(e=>norm(e.eventType).includes('preventive maintenance')||norm(e.eventType).includes('bao tri dinh ky'));
 return rows.map(e=>parseDate(e.date)).filter(Boolean).sort((a,b)=>b-a)[0]||null;
}
function pmRow(e){
 const months=cycleMonths(e.maintenanceCycle);
 const last=latestPmDate(e.asset);
 const base=last||parseDate(e.installationDate);
 const next=addMonths(base,months);
 let cls='nodata',label='Chưa có ngày gốc';
 if(next){
   const now=new Date();now.setHours(0,0,0,0);
   const currentMonth=new Date(now.getFullYear(),now.getMonth(),1);
   const dueMonth=new Date(next.getFullYear(),next.getMonth(),1);
   const monthGap=(dueMonth.getFullYear()-currentMonth.getFullYear())*12+(dueMonth.getMonth()-currentMonth.getMonth());
   const n=Math.ceil((next-now)/86400000);
   if(monthGap<0){
     cls='overdue';
     label=`Trễ ${Math.abs(monthGap)} tháng`;
   }else if(monthGap===0){
     cls='due-soon';
     label='Trong tháng này – chưa trễ';
   }else if(n<=60){
     cls='due-soon';
     label=`Còn ${n} ngày`;
   }else{
     cls='ok';
     label=`Còn ${n} ngày`;
   }
 }
 return {e,last,next,cls,label};
}
function renderMaintenance(){
 const all=D.equipment.filter(isMaintenancePlanned).map(pmRow);
 const q=norm($('#maintenanceSearch')?.value||''),sf=$('#maintenanceStatus')?.value||'';
 const rows=all.filter(r=>(!sf||r.cls===sf)&&(!q||norm([r.e.asset,r.e.name,r.e.assetName,r.e.position,r.e.maintenanceCycle].join(' ')).includes(q))).sort((a,b)=>(a.next?.getTime()||Infinity)-(b.next?.getTime()||Infinity));
 $('#pmTotal').textContent=all.length;$('#pmOverdue').textContent=all.filter(r=>r.cls==='overdue').length;$('#pmDueSoon').textContent=all.filter(r=>r.cls==='due-soon').length;$('#pmNoDate').textContent=all.filter(r=>r.cls==='nodata').length;
 $('#maintenanceBody').innerHTML=rows.length?rows.map((r,i)=>`<tr class="clickable" data-asset="${esc(r.e.asset)}"><td>${i+1}</td><td><b>${esc(r.e.name||r.e.assetName)}</b></td><td>${esc(r.e.asset)}</td><td>${esc(r.e.position||'—')}</td><td>${esc(r.e.maintenanceCycle)}</td><td>${r.last?fmtDate(r.last.toISOString().slice(0,10)):'—'}</td><td>${r.next?fmtDate(r.next.toISOString().slice(0,10)):'—'}</td><td><span class="status ${r.cls}">${r.label}</span></td><td>${r.cls==='overdue'?`<button class="explain-btn" data-explain="${esc(r.e.asset)}" type="button">Giải trình</button>`:'—'}</td></tr>`).join(''):'<tr><td colspan="9" class="empty">Không có thiết bị phù hợp.</td></tr>';
 bindAssetRows('#maintenanceBody');
}
$('#maintenanceSearch').oninput=renderMaintenance;$('#maintenanceStatus').onchange=renderMaintenance;

function assetUrl(asset){let u=new URL(location.href);u.hash='';u.search='';u.searchParams.set('asset',asset);u.searchParams.set('lang','vi');return u.toString()}
function qrUrl(asset){return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data='+encodeURIComponent(assetUrl(asset))}
function renderQR(){
 let q=norm($('#qrSearch').value),rows=D.equipment.filter(e=>!q||norm([e.asset,e.name,e.assetName,e.model,e.serial].join(' ')).includes(q));
 $('#qrCount').textContent=rows.length+' QR';
 $('#qrGrid').innerHTML=rows.map(e=>`<div class="qr-card"><img loading="lazy" src="${qrUrl(e.asset)}"><div class="asset">${esc(e.asset)}</div><div class="name">${esc(e.name||e.assetName)}</div><div class="model">${esc(e.model||'')}</div><div class="qr-actions"><button data-open="${esc(e.asset)}">Mở máy</button><button data-copy="${esc(e.asset)}">Sao chép link</button></div></div>`).join('');
 $$('[data-open]').forEach(b=>b.onclick=()=>openAsset(b.dataset.open));
 $$('[data-copy]').forEach(b=>b.onclick=async()=>{let u=assetUrl(b.dataset.copy);try{await navigator.clipboard.writeText(u);b.textContent='Đã sao chép';setTimeout(()=>b.textContent='Sao chép link',1000)}catch{prompt('Sao chép liên kết:',u)}});
}
$('#qrSearch').oninput=renderQR;$('#printQR').onclick=()=>print();

function openAsset(asset){
 let e=D.equipment.find(x=>x.asset===asset);if(!e)return;
 let ev=eventByAsset.get(asset)||[];
 $('#detailAsset').textContent=e.asset;$('#detailName').textContent=e.name||e.assetName;$('#detailEventCount').textContent=ev.length+' lịch sử / records';
 const f=[['Phân loại / Category',e.category],['Mã tài sản / Asset code',e.asset],['Tên thiết bị / Equipment',e.name],['Model',e.model],['Serial',e.serial],['Thông số / Parameter',e.parameter],['Hãng SX / Manufacturer',e.manufacturer],['Nhà cung cấp / Vendor',e.vendor],['Vị trí / Position',e.position],['Chu kỳ bảo dưỡng / PM cycle',e.maintenanceCycle],['Ngày lắp đặt / Installation',fmtDate(e.installationDate)],['Kiểm định / Inspection Due',fmtDate(e.accreditation)],['Hiệu chuẩn / Calibration Due',fmtDate(e.calibration)],['Ghi chú / Note',e.note]];
 $('#infoGrid').innerHTML=f.map(([l,v])=>`<div class="info"><label>${esc(l)}</label><b>${esc(v||'—')}</b></div>`).join('');
 $('#timeline').innerHTML=ev.length?ev.map(x=>`<div class="event"><h3>${fmtDate(x.date)} · ${esc(cleanType(x.eventType))} · ${statusHTML(x)}</h3><div class="meta">Phụ trách: ${esc(x.technician||'—')} · Approver: ${esc(x.approver||'Chờ duyệt')}</div>${x.description?`<p><b>Nội dung:</b> ${esc(x.description)}</p>`:''}${x.cause?`<p><b>Nguyên nhân:</b> ${esc(x.cause)}</p>`:''}${x.result?`<p><b>Kết quả:</b> ${esc(x.result)}</p>`:''}${x.note?`<p><b>Ghi chú:</b> ${esc(x.note)}</p>`:''}</div>`).join(''):'<div class="empty">Chưa có lịch sử.</div>';
 let u=new URL(location.href);u.hash='';u.searchParams.set('asset',asset);history.pushState({},'',u);setView('detail',false);
}
function bindAssetRows(sel){$$(sel+' [data-asset]').forEach(r=>r.onclick=(ev)=>{if(ev.target.closest('button'))return;openAsset(r.dataset.asset)})}
$('#backBtn').onclick=()=>{history.back()};$('#printDetail').onclick=()=>print();
$('#copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#copyLink').textContent='Đã sao chép';setTimeout(()=>$('#copyLink').textContent='Sao chép link QR',1000)}catch{prompt('Sao chép liên kết:',location.href)}};

function clock(){let d=new Date();$('#clock').textContent=d.toLocaleTimeString('vi-VN');$('#today').textContent=d.toLocaleDateString('vi-VN')}
setInterval(clock,1000);clock();


function formatGenerated(value){if(!value)return'Chưa xác định';const raw=String(value).trim();const p=new Date(raw.replace(' ','T'));return !isNaN(p)?p.toLocaleString('vi-VN'):raw}
$('#lastDataUpdate').textContent='Dữ liệu cập nhật: '+formatGenerated(D.generated);
let html5QrCode=null,scannerRunning=false;
function extractAssetFromScan(text){try{const u=new URL(text,location.href);const a=u.searchParams.get('asset');if(a)return a.trim()}catch(e){}return String(text||'').trim()}
async function stopScanner(){if(html5QrCode&&scannerRunning){try{await html5QrCode.stop()}catch(e){}try{await html5QrCode.clear()}catch(e){}}scannerRunning=false;$('#scannerStatus').textContent='Đã dừng camera.'}
async function startScanner(){const s=$('#scannerStatus');if(!window.Html5Qrcode){s.textContent='Không tải được thư viện quét QR.';return}if(scannerRunning)return;try{html5QrCode=new Html5Qrcode('qr-reader');scannerRunning=true;await html5QrCode.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:250}},async text=>{const asset=extractAssetFromScan(text);const found=D.equipment.find(e=>e.asset===asset);if(found){await stopScanner();$('#qrScannerModal').classList.add('hidden');location.href=assetUrl(asset)}else{s.textContent='Không tìm thấy mã thiết bị: '+asset}},()=>{});s.textContent='Đang quét QR...'}catch(err){scannerRunning=false;s.textContent='Không mở được camera. Hãy cho phép quyền camera và dùng HTTPS.'}}
function openScanner(){$('#qrScannerModal').classList.remove('hidden');$('#scannerStatus').textContent='Nhấn MỞ CAMERA để bắt đầu quét.'}
async function closeScanner(){await stopScanner();$('#qrScannerModal').classList.add('hidden')}
$('#scanQrSide').addEventListener('click',openScanner);$('#scanQrMobile').addEventListener('click',openScanner);$('#startScanner').addEventListener('click',startScanner);$('#stopScanner').addEventListener('click',stopScanner);$('#closeScanner').addEventListener('click',closeScanner);

window.NEMS_SET_REMOTE_EVENTS=(rows)=>{D.events=D.events.filter(e=>!e._remote).concat((rows||[]).map(e=>({...e,_remote:true})));rebuildEventIndex();dashboard();renderMaintenance();renderHistory();};
window.NEMS_REFRESH_VIEWS=()=>{rebuildEventIndex();dashboard();renderEquipment();renderMaintenance();renderHistory();dueTable('inspection');dueTable('calibration');renderQR();};
dashboard();renderEquipment();renderMaintenance();renderHistory();dueTable('inspection');dueTable('calibration');renderQR();
let initial=new URLSearchParams(location.search).get('asset');
if(initial)openAsset(initial);else setView((location.hash||'#dashboard').slice(1),false);
window.onpopstate=()=>{let a=new URLSearchParams(location.search).get('asset');if(a)openAsset(a);else setView((location.hash||'#dashboard').slice(1),false)};

}).catch(err=>console.error('NEMS startup failed:',err));
