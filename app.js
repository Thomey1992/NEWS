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
sortedEvents().forEach(e=>{if(!eventByAsset.has(e.asset))eventByAsset.set(e.asset,[]);eventByAsset.get(e.asset).push(e)});

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

  $('#recentHistory').innerHTML=sortedEvents().slice(0,7).map(e=>`<tr class="clickable" data-asset="${esc(e.asset)}"><td><b>${fmtDate(e.date)}</b></td><td>${esc(cleanType(e.eventType))}</td><td>${esc(e.description)}</td><td>${esc(e.technician||'—')}</td><td>${statusHTML(e)}</td></tr>`).join('');
  bindAssetRows('#recentHistory');

  renderMini('#inspectionMini',insp,'accreditation');
  renderMini('#calibrationMini',cal,'calibration');
}
function renderMini(sel,rows,field){
  let a=[...rows].sort((x,y)=>(parseDate(x[field])?.getTime()||Infinity)-(parseDate(y[field])?.getTime()||Infinity)).slice(0,5);
  $(sel).innerHTML=a.length?a.map(e=>{let s=dueStatus(e[field]);return `<div class="mini-row clickable" data-asset="${esc(e.asset)}"><div><b>${esc(e.name||e.assetName)}</b><br><span>${esc(e.asset)}</span></div><div>${fmtDate(e[field])}</div><div><span class="status ${s.c}">${s.t}</span></div></div>`}).join(''):'<div class="mini-empty">Chưa có ngày đến hạn trong dữ liệu nguồn.<br>No due date available.</div>';
  bindAssetRows(sel);
}

const areaSel=$('#areaFilter');
[...new Set(D.equipment.map(x=>x.position).filter(Boolean))].sort().forEach(x=>areaSel.add(new Option(x,x)));
function renderEquipment(){
 let q=norm($('#equipmentSearch').value),a=areaSel.value;
 let rows=D.equipment.filter(e=>(!a||e.position===a)&&(!q||norm([e.asset,e.name,e.assetName,e.model,e.serial,e.position].join(' ')).includes(q)));
 $('#equipmentCount').textContent=rows.length+' thiết bị / equipment';
 $('#equipmentBody').innerHTML=rows.map(e=>`<tr class="clickable" data-asset="${esc(e.asset)}"><td>${esc(e.no)}</td><td><b>${esc(e.asset)}</b></td><td>${esc(e.name||e.assetName)}</td><td>${esc(e.model||'—')}</td><td>${esc(e.serial||'—')}</td><td>${esc(e.position||'—')}</td><td>${(eventByAsset.get(e.asset)||[]).length}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Không tìm thấy thiết bị.</td></tr>';
 bindAssetRows('#equipmentBody');
}
$('#equipmentSearch').oninput=renderEquipment;areaSel.onchange=renderEquipment;

function renderHistory(){
 let q=norm($('#historySearch').value),s=$('#historyStatus').value;
 let rows=sortedEvents().filter(e=>(!s||(s==='approved'?isApproved(e):!isApproved(e)))&&(!q||norm([e.asset,e.name,e.eventType,e.description,e.technician,e.result].join(' ')).includes(q)));
 $('#historyCount').textContent=rows.length+' bản ghi / records';
 $('#historyBody').innerHTML=rows.map(e=>`<tr class="clickable" data-asset="${esc(e.asset)}"><td><b>${fmtDate(e.date)}</b></td><td>${esc(e.asset)}</td><td>${esc(e.name||e.assetName)}</td><td>${esc(cleanType(e.eventType))}</td><td>${esc(e.description)}</td><td>${esc(e.technician||'—')}</td><td>${statusHTML(e)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Không có dữ liệu.</td></tr>';
 bindAssetRows('#historyBody');
}
$('#historySearch').oninput=renderHistory;$('#historyStatus').onchange=renderHistory;

function dueTable(type){
 const field=type==='inspection'?'accreditation':'calibration',body=$('#'+type+'Body'),search=norm($('#'+type+'Search').value);
 let rows=D.equipment.filter(e=>parseDate(e[field])&&(!search||norm([e.asset,e.name,e.assetName,e.model,e.position].join(' ')).includes(search))).sort((a,b)=>parseDate(a[field])-parseDate(b[field]));
 body.innerHTML=rows.length?rows.map(e=>{let s=dueStatus(e[field]);let n=dayDiff(e[field]);return `<tr class="clickable" data-asset="${esc(e.asset)}"><td><b>${esc(e.name||e.assetName)}</b></td><td>${esc(e.asset)}</td><td>${esc(e.position||'—')}</td><td>${fmtDate(e[field])}</td><td>${n===null?'—':(n<0?`${Math.abs(n)} ngày quá hạn`:`${n} ngày`)}</td><td><span class="status ${s.c}">${s.t}</span></td></tr>`}).join(''):`<tr><td colspan="6" class="empty">${type==='calibration'?'Hiện file Excel chưa có ngày hiệu chuẩn hợp lệ.':'Không có dữ liệu kiểm định.'}</td></tr>`;
 bindAssetRows('#'+type+'Body');
}
$('#inspectionSearch').oninput=()=>dueTable('inspection');$('#calibrationSearch').oninput=()=>dueTable('calibration');

function assetUrl(asset){let u=new URL(location.href);u.hash='';u.search='';u.searchParams.set('asset',asset);return u.toString()}
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
function bindAssetRows(sel){$$(sel+' [data-asset]').forEach(r=>r.onclick=()=>openAsset(r.dataset.asset))}
$('#backBtn').onclick=()=>{history.back()};$('#printDetail').onclick=()=>print();
$('#copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#copyLink').textContent='Đã sao chép';setTimeout(()=>$('#copyLink').textContent='Sao chép link QR',1000)}catch{prompt('Sao chép liên kết:',location.href)}};

function clock(){let d=new Date();$('#clock').textContent=d.toLocaleTimeString('vi-VN');$('#today').textContent=d.toLocaleDateString('vi-VN')}
setInterval(clock,1000);clock();


function formatGenerated(value){if(!value)return'Chưa xác định';const raw=String(value).trim();const p=new Date(raw.replace(' ','T'));return !isNaN(p)?p.toLocaleString('vi-VN'):raw}
$('#lastDataUpdate').textContent='Dữ liệu cập nhật: '+formatGenerated(D.generated);
let html5QrCode=null,scannerRunning=false;
function extractAssetFromScan(text){try{const u=new URL(text,location.href);const a=u.searchParams.get('asset');if(a)return a.trim()}catch(e){}return String(text||'').trim()}
async function stopScanner(){if(html5QrCode&&scannerRunning){try{await html5QrCode.stop()}catch(e){}try{await html5QrCode.clear()}catch(e){}}scannerRunning=false;$('#scannerStatus').textContent='Đã dừng camera.'}
async function startScanner(){const s=$('#scannerStatus');if(!window.Html5Qrcode){s.textContent='Không tải được thư viện quét QR.';return}if(scannerRunning)return;try{html5QrCode=new Html5Qrcode('qr-reader');scannerRunning=true;await html5QrCode.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:250}},async text=>{const asset=extractAssetFromScan(text);const found=D.equipment.find(e=>e.asset===asset);if(found){await stopScanner();$('#qrScannerModal').classList.add('hidden');openAsset(asset)}else{s.textContent='Không tìm thấy mã thiết bị: '+asset}},()=>{});s.textContent='Đang quét QR...'}catch(err){scannerRunning=false;s.textContent='Không mở được camera. Hãy cho phép quyền camera và dùng HTTPS.'}}
function openScanner(){$('#qrScannerModal').classList.remove('hidden');$('#scannerStatus').textContent='Nhấn MỞ CAMERA để bắt đầu quét.'}
async function closeScanner(){await stopScanner();$('#qrScannerModal').classList.add('hidden')}
$('#scanQrSide').addEventListener('click',openScanner);$('#scanQrMobile').addEventListener('click',openScanner);$('#startScanner').addEventListener('click',startScanner);$('#stopScanner').addEventListener('click',stopScanner);$('#closeScanner').addEventListener('click',closeScanner);

dashboard();renderEquipment();renderHistory();dueTable('inspection');dueTable('calibration');renderQR();
let initial=new URLSearchParams(location.search).get('asset');
if(initial)openAsset(initial);else setView((location.hash||'#dashboard').slice(1),false);
window.onpopstate=()=>{let a=new URLSearchParams(location.search).get('asset');if(a)openAsset(a);else setView((location.hash||'#dashboard').slice(1),false)};

}).catch(err=>console.error('NEMS startup failed:',err));
