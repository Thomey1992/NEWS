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
 let rows=sortedEvents().filter(e=>(!s||(s==='approved'?isApproved(e):!isApproved(e)))&&(!q||norm([e.asset,e.name,e.assetName,e.area,e.model,e.serial,e.eventType,e.description,e.cause,e.result,e.columnK,e.note,e.technician,e.approver].join(' ')).includes(q)));
 $('#historyCount').textContent=rows.length+' bản ghi / records';
 $('#historyBody').innerHTML=rows.map((e,i)=>`<tr ${e.asset?`class="clickable" data-asset="${esc(e.asset)}"`:''}><td>${i+1}</td><td><b>${fmtDate(e.date)}</b></td><td>${esc(e.asset||'—')}</td><td>${esc(e.area||'—')}</td><td>${esc(e.name||e.assetName||'—')}</td><td>${esc(e.model||'—')}</td><td>${esc(e.serial||'—')}</td><td>${esc(cleanType(e.eventType))}</td><td class="wrap-text">${esc(e.description||'—')}</td><td class="wrap-text">${esc(e.cause||'—')}</td><td class="wrap-text">${esc(e.result||'—')}</td><td class="wrap-text">${esc(e.columnK||'—')}</td><td>${esc(e.downtime||'—')}</td><td class="wrap-text">${esc(e.note||'—')}</td><td>${esc(e.technician||'—')}</td><td>${esc(e.approver||'—')}</td><td>${statusHTML(e)}</td></tr>`).join('')||'<tr><td colspan="17" class="empty">Không có dữ liệu.</td></tr>';
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


function maintenanceCycleInfo(value){
 const raw=String(value||'').trim(),c=norm(raw);
 if(!c||c==='n/a'||c==='na'||c.includes('khong ap dung'))return {type:'na',label:'N/A'};
 if(c.includes('bao tri theo dieu kien')||c.includes('bao tri co dieu kien')||c.includes('condition-based')||c.includes('condition based')||c.includes('contdition')||c==='cbm')return {type:'condition',label:'Bảo trì theo điều kiện'};
 let m=raw.match(/(\d+)\s*(?:tháng|thang|months?|mos?)/i);if(m)return {type:'month',value:Number(m[1]),label:`${Number(m[1])} tháng`};
 m=raw.match(/(\d+(?:[.,]\d+)?)\s*(?:h|giờ|gio|hours?)/i);if(m)return {type:'hour',value:Number(m[1].replace(',','.')),label:`${Number(m[1].replace(',','.'))} giờ`};
 m=raw.match(/(\d[\d.,]*)\s*(?:sản phẩm|san pham|products?|pcs)/i);if(m)return {type:'product',value:Number(m[1].replace(/[.,]/g,'')),label:`${m[1]} sản phẩm`};
 if(c.includes('theo gio'))return {type:'hour',value:null,label:'Theo giờ'};
 if(c.includes('theo thang'))return {type:'month',value:null,label:'Theo tháng'};
 if(c.includes('theo san pham'))return {type:'product',value:null,label:'Theo sản phẩm'};
 return {type:'unknown',label:raw||'Chưa xác định'};
}
function isMaintenancePlanned(e){return maintenanceCycleInfo(e.maintenanceCycle).type!=='na'}
function cycleMonths(value){const x=maintenanceCycleInfo(value);return x.type==='month'?x.value:null}
function addMonths(date,months){if(!date||!months)return null;return new Date(date.getFullYear(),date.getMonth()+months,date.getDate())}
function isPmEvent(e){const t=norm(e.eventType);return t.includes('preventive maintenance')||t.includes('bao tri dinh ky')||t==='pm'||t.includes('bao tri theo dieu kien')}
function latestPmDate(asset){const rows=(eventByAsset.get(asset)||[]).filter(isPmEvent);return rows.map(e=>parseDate(e.date)).filter(Boolean).sort((a,b)=>b-a)[0]||null}
function pmEvents(asset){return (eventByAsset.get(asset)||[]).filter(isPmEvent).filter(e=>parseDate(e.date))}
function pmRow(e){
 const info=maintenanceCycleInfo(e.maintenanceCycle),last=latestPmDate(e.asset),base=last||parseDate(e.installationDate);
 let next=null,cls='nodata',label='Chưa có ngày gốc';
 if(info.type==='condition'){cls='condition';label='Theo điều kiện'}
 else if(info.type==='hour'){cls='runtime';label=info.value?`Mỗi ${info.value} giờ`:'Theo giờ'}
 else if(info.type==='product'){cls='production';label=info.value?`Mỗi ${info.value.toLocaleString('vi-VN')} SP`:'Theo sản phẩm'}
 else if(info.type==='unknown'){cls='nodata';label='Chưa nhận dạng chu kỳ'}
 else if(info.type==='month'&&info.value){
  next=addMonths(base,info.value);
  if(next){const now=new Date();now.setHours(0,0,0,0);const currentMonth=new Date(now.getFullYear(),now.getMonth(),1),dueMonth=new Date(next.getFullYear(),next.getMonth(),1);const monthGap=(dueMonth.getFullYear()-currentMonth.getFullYear())*12+(dueMonth.getMonth()-currentMonth.getMonth()),n=Math.ceil((next-now)/86400000);if(monthGap<0){cls='overdue';label=`Trễ ${Math.abs(monthGap)} tháng`}else if(monthGap===0){cls='due-soon';label='Trong tháng này – chưa trễ'}else if(n<=60){cls='due-soon';label=`Còn ${n} ngày`}else{cls='ok';label=`Còn ${n} ngày`}}
 }
 return {e,last,next,cls,label,info};
}
function latestMaintenanceExplanation(asset){return (eventByAsset.get(asset)||[]).find(e=>norm(e.eventType).includes('pm explanation')||norm(e.eventType).includes('giai trinh bao tri'))||null}
function explanationCell(r){if(r.cls!=='overdue')return '—';const ex=latestMaintenanceExplanation(r.e.asset);if(!ex)return `<div class="explanation-box missing"><span class="explanation-state">Chưa giải trình</span><button class="explain-btn" data-explain="${esc(r.e.asset)}" type="button">Nhập giải trình</button></div>`;const planned=ex.plannedDate||'—';return `<div class="explanation-box done"><span class="explanation-state">Đã giải trình</span><small>Dự kiến PM: ${esc(fmtDate(planned))}</small><div class="explanation-actions"><button class="secondary-btn mini" data-explanation-view="${esc(r.e.asset)}" type="button">Xem</button><button class="explain-btn mini" data-explain="${esc(r.e.asset)}" type="button">Cập nhật</button></div></div>`}
function renderMaintenance(){
 const all=D.equipment.filter(isMaintenancePlanned).map(pmRow),q=norm($('#maintenanceSearch')?.value||''),sf=$('#maintenanceStatus')?.value||'';
 const rows=all.filter(r=>(!sf||r.cls===sf)&&(!q||norm([r.e.asset,r.e.name,r.e.assetName,r.e.position,r.e.maintenanceCycle].join(' ')).includes(q))).sort((a,b)=>(a.next?.getTime()||Infinity)-(b.next?.getTime()||Infinity));
 const overdue=all.filter(r=>r.cls==='overdue'),explained=overdue.filter(r=>latestMaintenanceExplanation(r.e.asset)).length;
 $('#pmTotal').textContent=all.length;$('#pmOverdue').textContent=overdue.length;$('#pmExplained').textContent=explained;$('#pmUnexplained').textContent=overdue.length-explained;$('#pmDueSoon').textContent=all.filter(r=>r.cls==='due-soon').length;$('#pmNoDate').textContent=all.filter(r=>r.cls==='nodata').length;
 $('#maintenanceBody').innerHTML=rows.length?rows.map((r,i)=>`<tr class="clickable" data-asset="${esc(r.e.asset)}"><td>${i+1}</td><td><b>${esc(r.e.name||r.e.assetName)}</b></td><td>${esc(r.e.asset)}</td><td>${esc(r.e.position||'—')}</td><td>${esc(r.e.maintenanceCycle)}</td><td>${r.last?fmtDate(r.last.toISOString().slice(0,10)):'—'}</td><td>${r.next?fmtDate(r.next.toISOString().slice(0,10)):'—'}</td><td><span class="status ${r.cls}">${r.label}</span></td><td>${explanationCell(r)}</td></tr>`).join(''):'<tr><td colspan="9" class="empty">Không có thiết bị phù hợp.</td></tr>';
 bindAssetRows('#maintenanceBody');renderAnnualPlan();
}
function selectedPlanYear(){return Number($('#maintenanceYear')?.value)||new Date().getFullYear()}
function strategyChangeEvents(asset){return (eventByAsset.get(asset)||[]).filter(e=>norm(e.eventType).includes('maintenance strategy change')||norm(e.eventType).includes('thay doi chien luoc bao tri')).map(e=>({...e,_effective:parseDate(e.effectiveDate||e.date)})).filter(e=>e._effective).sort((a,b)=>a._effective-b._effective)}
function cycleForMonth(e,year,month){
 const point=new Date(year,month,15),changes=strategyChangeEvents(e.asset);
 let cycle=e.maintenanceCycle;
 // Đi ngược lịch sử: nếu tháng đang xem nằm trước ngày hiệu lực, dùng chu kỳ cũ.
 for(let i=changes.length-1;i>=0;i--){const c=changes[i];if(point<c._effective)cycle=c.oldCycle||cycle;else if(c.newCycle)cycle=c.newCycle}
 return cycle;
}
function planMonthsForCycle(e,year,cycle){const info=maintenanceCycleInfo(cycle);if(info.type!=='month'||!info.value)return[];let start=0;const installed=parseDate(e.installationDate);if(installed&&installed.getFullYear()===year)start=installed.getMonth();const out=[];for(let m=start;m<12;m+=info.value)out.push(m);return out}
function monthActuals(asset,year,month){return pmEvents(asset).filter(e=>{const d=parseDate(e.date);return d&&d.getFullYear()===year&&d.getMonth()===month}).map(e=>parseDate(e.date)).sort((a,b)=>a-b)}
function hasActualInYear(e,year){return pmEvents(e.asset).some(x=>{const d=parseDate(x.date);return d&&d.getFullYear()===year})}
function installedByEndOfYear(e,year){const d=parseDate(e.installationDate);return !d||d.getFullYear()<=year}
function installedByMonth(e,year,month){const d=parseDate(e.installationDate);if(!d)return true;const end=new Date(year,month+1,0,23,59,59,999);return d<=end}
function hasMonthlyPlanInYear(e,year){if(!installedByEndOfYear(e,year))return false;for(let m=0;m<12;m++){const cycle=cycleForMonth(e,year,m),info=maintenanceCycleInfo(cycle);if(info.type==='month'&&info.value&&planMonthsForCycle(e,year,cycle).includes(m))return true}return false}
function showInAnnualPlan(e,year){if(!installedByEndOfYear(e,year))return false;return hasMonthlyPlanInYear(e,year)||hasActualInYear(e,year)}
function annualCell(e,year,month,rowType){
 // Không hiển thị KH/TH ở thời điểm thiết bị chưa được lắp đặt.
 if(!installedByMonth(e,year,month))return '<td class="annual-not-installed" title="Thiết bị chưa lắp đặt tại thời điểm này"></td>';
 const cycle=cycleForMonth(e,year,month),info=maintenanceCycleInfo(cycle),actuals=monthActuals(e.asset,year,month),dates=actuals.map(d=>String(d.getDate()).padStart(2,'0')).join(', ');
 if(rowType==='actual')return actuals.length?`<td class="annual-done" title="Đã bảo trì: ${dates}/${month+1}/${year}">${dates}</td>`:'<td></td>';
 // Chỉ tạo KH cho chu kỳ theo tháng. Lịch sử Actual vẫn giữ lại từ ngày thiết bị đã lắp đặt.
 if(info.type!=='month'||!info.value)return '<td></td>';
 const planned=planMonthsForCycle(e,year,cycle).includes(month);if(!planned)return '<td></td>';if(actuals.length)return '<td class="annual-done">X ✓</td>';
 const now=new Date(),cellMonth=new Date(year,month,1),thisMonth=new Date(now.getFullYear(),now.getMonth(),1);
 if(cellMonth<thisMonth)return '<td class="annual-late" title="Đã qua tháng kế hoạch nhưng chưa có lịch sử PM">CHƯA BT</td>';
 if(cellMonth.getTime()===thisMonth.getTime())return '<td class="annual-current">X · ĐẾN HẠN</td>';
 return '<td class="annual-plan">X</td>';
}
function displayCycleForYear(e,year){
 const values=[];for(let m=0;m<12;m++){const c=String(cycleForMonth(e,year,m)||'').trim();if(c&&!values.includes(c))values.push(c)}
 if(values.length<=1)return values[0]||e.maintenanceCycle||'N/A';
 return `${values[0]} → ${values[values.length-1]}`;
}
function renderAnnualPlan(){
 const y=selectedPlanYear(),head=$('#annualPlanHead'),body=$('#annualPlanBody');if(!head||!body)return;
 head.innerHTML=`<tr><th rowspan="2">STT<br>No.</th><th rowspan="2">TÊN MMTB / HỆ THỐNG<br>Name</th><th rowspan="2">MÃ TÀI SẢN<br>Asset</th><th rowspan="2">NGÀY LẮP ĐẶT<br>Installation date</th><th rowspan="2">CHU KỲ BẢO DƯỠNG<br>Maintenance cycle</th><th colspan="24">THỜI GIAN BẢO TRÌ NĂM ${y} / MAINTENANCE PERIOD</th></tr><tr>${Array.from({length:12},(_,m)=>`<th colspan="2">${m+1}<br><small>${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]}</small></th>`).join('')}</tr><tr><th colspan="5"></th>${Array.from({length:12},()=>'<th>KH<br>Plan</th><th>TH<br>Actual</th>').join('')}</tr>`;
 let n=0,lateCount=0,rows='';const groups=new Map();
 D.equipment.filter(e=>showInAnnualPlan(e,y)).forEach(e=>{const area=e.position||e.category||'Khác';if(!groups.has(area))groups.set(area,[]);groups.get(area).push(e)});
 groups.forEach((items,area)=>{rows+=`<tr class="annual-area"><td colspan="29">${esc(area)}</td></tr>`;items.forEach(e=>{n++;let cells='';for(let m=0;m<12;m++){const p=annualCell(e,y,m,'plan'),a=annualCell(e,y,m,'actual');if(p.includes('annual-late'))lateCount++;cells+=p+a}rows+=`<tr><td>${n}</td><td class="annual-name"><b>${esc(e.name||e.assetName||'')}</b><small>${esc(e.model||'')}</small></td><td>${esc(e.asset||'—')}</td><td class="annual-install-date">${fmtDate(e.installationDate)}</td><td>${esc(displayCycleForYear(e,y))}</td>${cells}</tr>`})});
 body.innerHTML=rows||'<tr><td colspan="29" class="empty">Không có thiết bị đã lắp đặt và có kế hoạch theo tháng hoặc lịch sử bảo trì trong năm này.</td></tr>';
 const warn=$('#annualPlanWarning');if(warn)warn.innerHTML=lateCount?`<b>⚠ ${lateCount} ô kế hoạch theo tháng đã qua hạn nhưng chưa tìm thấy lịch sử bảo trì.</b> Không tính CBM, theo giờ, theo sản phẩm và N/A. Thiết bị đã đổi chu kỳ vẫn giữ nguyên lịch sử Actual.`:'<b>✓ Không có kế hoạch PM theo tháng quá hạn chưa thực hiện trong năm đang chọn.</b> Lịch sử bảo trì của thiết bị đã đổi chu kỳ vẫn được giữ lại.';
}
window.NEMS_GET_EXPLANATION=asset=>latestMaintenanceExplanation(asset);
$('#maintenanceSearch').oninput=renderMaintenance;$('#maintenanceStatus').onchange=renderMaintenance;
const yearSelect=$('#maintenanceYear');if(yearSelect){const cy=new Date().getFullYear();yearSelect.innerHTML=Array.from({length:7},(_,i)=>cy-3+i).map(y=>`<option value="${y}" ${y===cy?'selected':''}>${y}</option>`).join('');yearSelect.onchange=renderAnnualPlan}
const printPlan=$('#printMaintenancePlan');if(printPlan)printPlan.onclick=()=>{document.body.classList.add('print-maintenance-plan');window.print();setTimeout(()=>document.body.classList.remove('print-maintenance-plan'),300)};
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
