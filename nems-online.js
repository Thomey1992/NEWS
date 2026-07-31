(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>(s??'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const API=()=>String(window.NEMS_ONLINE_API_URL||'').trim();
const USERS={
 '1369':{name:'Thomey',role:'Head of Engineering Department'},
 '3617':{name:'Nguyễn Văn Khang',role:'Engineer'},
 '3836':{name:'Nguyễn Hoàng Đức',role:'Engineer'},
 '2243':{name:'Phạm Thế Hòa',role:'Experienced Technician'}
};
const EQUIP={
 forklift:[
  {key:'forklift1',asset:'2113000110-0',name:'Xe nâng điện hiệu Toyota 8FBR18-15170',label:'Toyota 8FBR18'},
  {key:'forklift2',asset:'2113000105-0',name:'Xe nâng hiệu BT-LWE200 (Toyota)',label:'Toyota LWE200'}
 ],
 compressor:[
  {key:'compressor5',asset:'DB001',name:'Máy nén khí 5',label:'Máy nén khí 5 · DB001'},
  {key:'compressor6',asset:'DB002',name:'Máy nén khí 6',label:'Máy nén khí 6 · DB002'},
  {key:'compressor4',asset:'C4HC42113',name:'Máy nén khí 4',label:'Máy nén khí 4 · C4HC42113'}
 ]
};
let runtime={forklift:[],compressor:[]}, charts={}, activeUser=null, remoteExplanations=[], remoteStrategyChanges=[];
function syncRemoteEvents(){window.NEMS_SET_REMOTE_EVENTS?.([...remoteExplanations,...remoteStrategyChanges])}
function apiReady(){return API().startsWith('https://script.google.com/')}
async function request(action,payload={}){
 if(!apiReady())throw new Error('Chưa cấu hình URL Google Apps Script.');
 const r=await fetch(API(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload}),redirect:'follow'});
 if(!r.ok)throw new Error('Lỗi kết nối HTTP '+r.status);
 const d=await r.json(); if(!d.ok)throw new Error(d.error||'Google Apps Script trả về lỗi.'); return d;
}
function localLogin(pin){const u=USERS[pin];if(!u)throw new Error('Mã PIN không đúng.');activeUser={...u,pin};sessionStorage.setItem('nems_online_pin',pin);return activeUser}
function currentUser(){if(activeUser)return activeUser;const p=sessionStorage.getItem('nems_online_pin');if(p&&USERS[p])return localLogin(p);return null}
function modal(title,html,onSubmit){$('#onlineModalTitle').textContent=title;$('#onlineForm').innerHTML=html;$('#onlineModal').classList.remove('hidden');$('#onlineForm').onsubmit=onSubmit}
function closeModal(){$('#onlineModal').classList.add('hidden');$('#onlineForm').innerHTML=''}
const onlineClose=$('#onlineModalClose'), onlineModal=$('#onlineModal'); if(onlineClose)onlineClose.onclick=closeModal;if(onlineModal)onlineModal.onclick=e=>{if(e.target===onlineModal)closeModal()};
function loginFields(){return `<div class="form-grid"><label>Người thực hiện / User<select id="onlineUser"><option value="">-- Chọn người dùng --</option><option value="1369">Thomey — Head of Engineering Department</option><option value="3617">Nguyễn Văn Khang — Engineer</option><option value="3836">Nguyễn Hoàng Đức — Engineer</option><option value="2243">Phạm Thế Hòa — Experienced Technician</option></select></label><label>Mã PIN / PIN<input id="onlinePin" type="password" inputmode="numeric" required maxlength="4" autocomplete="off"></label></div>`}
function bindLoginDefaults(){const u=currentUser();if(u){$('#onlineUser').value=u.pin;$('#onlinePin').value=u.pin}$('#onlineUser').onchange=()=>{$('#onlinePin').value=''}}
function formMsg(t,c=''){$('#onlineMessage').textContent=t;$('#onlineMessage').className='online-message '+c}
function findEquipment(asset){return (window.NEMS_DATA?.equipment||[]).find(e=>e.asset===asset)}
function openExplanation(asset){
 const e=findEquipment(asset);if(!e)return;
 const current=window.NEMS_GET_EXPLANATION?.(asset)||{};
 modal(current.asset?'CẬP NHẬT GIẢI TRÌNH BẢO TRÌ':'GIẢI TRÌNH BẢO TRÌ / MAINTENANCE EXPLANATION',`${loginFields()}<div class="readonly-card"><b>${esc(e.name||e.assetName)}</b><span>${esc(e.asset)} · ${esc(e.position||'')}</span></div>${current.asset?'<div class="online-message ok">Thiết bị này đã có giải trình. Lần lưu mới sẽ được ghi thêm vào lịch sử để bảo đảm truy xuất audit.</div>':''}<label>Lý do trễ hạn / Reason<textarea id="exReason" required placeholder="Ví dụ: Máy đang chạy liên tục theo kế hoạch sản xuất...">${esc(current.reason||current.cause||'')}</textarea></label><label>Ngày dự kiến thực hiện / Planned maintenance date<input id="exPlanned" type="date" required value="${esc(current.plannedDate||'')}"></label><label>Biện pháp kiểm soát tạm thời / Temporary control<textarea id="exControl" required placeholder="Ví dụ: Tăng kiểm tra đầu ca, theo dõi tiếng ồn, nhiệt độ...">${esc(current.temporaryControl||'')}</textarea></label><div id="onlineMessage" class="online-message"></div><div class="form-actions"><button type="button" class="secondary-btn" id="onlineCancel">HỦY</button><button type="submit" class="primary-btn">${current.asset?'LƯU BẢN CẬP NHẬT':'LƯU GIẢI TRÌNH'}</button></div>`,async ev=>{
  ev.preventDefault();const pin=$('#onlinePin').value.trim();if($('#onlineUser').value!==pin){formMsg('Người dùng và mã PIN không khớp.','error');return}
  try{const u=localLogin(pin);formMsg('Đang lưu vào Google Sheets...');await request('save_explanation',{pin,record:{asset:e.asset,equipmentName:e.name||e.assetName||'',area:e.position||'',model:e.model||'',serial:e.serial||'',reason:$('#exReason').value.trim(),plannedDate:$('#exPlanned').value,temporaryControl:$('#exControl').value.trim(),userName:u.name,userRole:u.role}});formMsg('Đã lưu giải trình thành công. Trạng thái trên bảng kế hoạch đã được cập nhật.','ok');await loadExplanations();setTimeout(closeModal,900)}catch(err){formMsg(err.message,'error')}
 });bindLoginDefaults();$('#onlineCancel').onclick=closeModal;
}
function viewExplanation(asset){
 const e=findEquipment(asset),x=window.NEMS_GET_EXPLANATION?.(asset);if(!e||!x)return;
 modal('CHI TIẾT GIẢI TRÌNH TRỄ BẢO TRÌ',`<div class="readonly-card"><b>${esc(e.name||e.assetName)}</b><span>${esc(e.asset)} · ${esc(e.position||'')}</span></div><div class="explanation-detail"><p><b>Trạng thái:</b> <span class="explanation-state">Đã giải trình</span></p><p><b>Lý do trễ:</b><br>${esc(x.reason||x.cause||'—')}</p><p><b>Ngày dự kiến thực hiện:</b><br>${esc(x.plannedDate||'—')}</p><p><b>Biện pháp kiểm soát tạm thời:</b><br>${esc(x.temporaryControl||'—')}</p><p><b>Người giải trình:</b><br>${esc(x.technician||'—')}</p><p><b>Thời gian ghi nhận:</b><br>${esc(x.timestamp||x.note||'—')}</p></div><div class="form-actions"><button type="button" class="secondary-btn" id="onlineCancel">ĐÓNG</button><button type="button" class="primary-btn" id="updateExplanation">CẬP NHẬT</button></div>`,ev=>ev.preventDefault());
 $('#onlineCancel').onclick=closeModal;$('#updateExplanation').onclick=()=>openExplanation(asset);
}
document.addEventListener('click',e=>{const view=e.target.closest('[data-explanation-view]');if(view){e.preventDefault();e.stopPropagation();viewExplanation(view.dataset.explanationView);return}const b=e.target.closest('[data-explain]');if(b){e.preventDefault();e.stopPropagation();openExplanation(b.dataset.explain)}});
async function loadExplanations(){try{const d=await request('list_explanations');remoteExplanations=(d.records||[]).map((x,i)=>({id:'GS-EX-'+i,date:x.timestamp?.slice(0,10)||x.date||'',timestamp:x.timestamp||'',area:x.area||'',asset:x.asset||'',assetName:x.equipmentName||'',name:x.equipmentName||'',model:x.model||'',serial:x.serial||'',eventType:'PM Explanation / Giải trình bảo trì',description:`Lý do: ${x.reason||''}`,cause:x.reason||'',reason:x.reason||'',plannedDate:x.plannedDate||'',temporaryControl:x.temporaryControl||'',result:`Ngày dự kiến PM: ${x.plannedDate||'—'}. Biện pháp kiểm soát: ${x.temporaryControl||'—'}`,downtime:'',note:`Ghi nhận online lúc ${x.timestamp||''} · Chức danh: ${x.userRole||''}`,technician:x.userName||'',approval:'Đã giải trình',approver:''}));syncRemoteEvents()}catch(err){console.warn('Không tải được giải trình:',err)}}

function openStrategyChange(){
 const options=(window.NEMS_DATA?.equipment||[]).map(e=>`<option value="${esc(e.asset)}">${esc(e.asset)} — ${esc(e.name||e.assetName||'')}</option>`).join('');
 const today=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 modal('GHI NHẬN CHUYỂN ĐỔI CHIẾN LƯỢC BẢO TRÌ',`${loginFields()}<label>Thiết bị / Equipment<select id="scAsset" required><option value="">-- Chọn thiết bị --</option>${options}</select></label><div class="form-grid"><label>Chu kỳ cũ / Old cycle<input id="scOld" required readonly></label><label>Chu kỳ mới / New cycle<select id="scNew" required><option>Bảo trì theo điều kiện</option><option>N/A</option><option>Theo giờ</option><option>Theo tháng</option><option>Theo sản phẩm</option></select></label></div><label>Ngày hiệu lực / Effective date<input id="scDate" type="date" required value="${today}"></label><label>Lý do thay đổi / Reason<textarea id="scReason" required placeholder="Ví dụ: Tần suất sử dụng không cố định; hướng dẫn nhà sản xuất yêu cầu kiểm tra theo tình trạng..."></textarea></label><label>Đánh giá rủi ro / Risk assessment<textarea id="scRisk" required placeholder="Nêu rủi ro nếu không bảo trì theo tháng và cơ sở cho thấy rủi ro được kiểm soát."></textarea></label><label>Biện pháp kiểm soát / Control<textarea id="scControl" required placeholder="Ví dụ: checklist trước/sau sử dụng, kiểm tra rò khí, rung, nhiệt độ; dừng máy khi vượt giới hạn..."></textarea></label><label>Người phê duyệt / Approver<input id="scApprover" required placeholder="Trưởng nhà máy / Trưởng bộ phận"></label><div class="online-message">Bản ghi này không xóa kế hoạch cũ và sẽ xuất hiện trong lịch sử thiết bị để truy xuất audit.</div><div id="onlineMessage" class="online-message"></div><div class="form-actions"><button type="button" class="secondary-btn" id="onlineCancel">HỦY</button><button type="submit" class="primary-btn">LƯU BẢN GHI CHUYỂN ĐỔI</button></div>`,async ev=>{
  ev.preventDefault();const pin=$('#onlinePin').value.trim();if($('#onlineUser').value!==pin){formMsg('Người dùng và mã PIN không khớp.','error');return}
  try{localLogin(pin);const e=findEquipment($('#scAsset').value);formMsg('Đang lưu bản ghi audit...');await request('save_strategy_change',{pin,record:{asset:e.asset,equipmentName:e.name||e.assetName||'',area:e.position||'',oldCycle:$('#scOld').value,newCycle:$('#scNew').value,effectiveDate:$('#scDate').value,reason:$('#scReason').value.trim(),riskAssessment:$('#scRisk').value.trim(),temporaryControl:$('#scControl').value.trim(),approver:$('#scApprover').value.trim()}});formMsg('Đã lưu. Sau khi cập nhật cột Chu kỳ bảo dưỡng trong Excel, lịch tháng sẽ tự dừng từ chiến lược mới.','ok');await loadStrategyChanges();setTimeout(closeModal,900)}catch(err){formMsg(err.message,'error')}
 });
 bindLoginDefaults();$('#onlineCancel').onclick=closeModal;$('#scAsset').onchange=()=>{const e=findEquipment($('#scAsset').value);$('#scOld').value=e?.maintenanceCycle||''};
}
async function loadStrategyChanges(){try{const d=await request('list_strategy_changes');remoteStrategyChanges=(d.records||[]).map((x,i)=>({id:'GS-SC-'+i,date:x.effectiveDate||x.timestamp?.slice(0,10)||'',timestamp:x.timestamp||'',area:x.area||'',asset:x.asset||'',assetName:x.equipmentName||'',name:x.equipmentName||'',eventType:'Maintenance Strategy Change / Thay đổi chiến lược bảo trì',oldCycle:x.oldCycle||'',newCycle:x.newCycle||'',effectiveDate:x.effectiveDate||'',description:`Chuyển từ “${x.oldCycle||''}” sang “${x.newCycle||''}”. Lý do: ${x.reason||''}`,cause:x.reason||'',result:`Đánh giá rủi ro: ${x.riskAssessment||''}. Biện pháp kiểm soát: ${x.temporaryControl||''}`,columnK:`Ngày hiệu lực: ${x.effectiveDate||'—'}`,note:`Ghi nhận online: ${x.timestamp||''}`,technician:x.userName||'',approval:'Đã phê duyệt',approver:x.approver||''}));syncRemoteEvents()}catch(err){console.warn('Không tải được lịch sử chuyển đổi:',err)}}
const strategyBtn=$('#strategyChangeBtn');if(strategyBtn)strategyBtn.onclick=openStrategyChange;
function runtimeRowFields(type,index,values={}){
 const defs=EQUIP[type];
 return `<div class="runtime-batch-row" data-row="${index}"><div class="runtime-batch-head"><b>Dòng ${index+1}</b><button type="button" class="runtime-remove-row secondary-btn">Xóa dòng</button></div><label>Thời gian ghi nhận / Record time<input class="runtime-time" type="datetime-local" required value="${esc(values.recordTime||'')}"></label>${defs.map(d=>`<label>${esc(d.label)}<input class="runtime-value" data-key="${d.key}" type="number" step="0.1" min="0" required value="${values[d.key]??''}" placeholder="Số giờ tích lũy"></label>`).join('')}</div>`;
}
function openRuntime(type,editRecord=null){
 const defs=EQUIP[type], isEdit=!!editRecord;
 const nowLocal=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 const first=isEdit?editRecord:{recordTime:nowLocal};
 modal(isEdit?(type==='forklift'?'SỬA GIỜ XE NÂNG':'SỬA GIỜ MÁY NÉN KHÍ'):(type==='forklift'?'NHẬP NHIỀU DÒNG GIỜ XE NÂNG':'NHẬP NHIỀU DÒNG GIỜ MÁY NÉN KHÍ'),`${loginFields()}<div id="runtimeRows">${runtimeRowFields(type,0,first)}</div>${isEdit?'':`<button type="button" class="secondary-btn" id="runtimeAddRow">＋ THÊM DÒNG KHÁC</button>`}<div id="onlineMessage" class="online-message"></div><div class="form-actions"><button type="button" class="secondary-btn" id="onlineCancel">HỦY</button><button type="submit" class="primary-btn">${isEdit?'LƯU THAY ĐỔI':'LƯU TẤT CẢ VÀO GOOGLE SHEETS'}</button></div>`,async ev=>{
  ev.preventDefault();const pin=$('#onlinePin').value.trim();if($('#onlineUser').value!==pin){formMsg('Người dùng và mã PIN không khớp.','error');return}
  try{
   const u=localLogin(pin);const rows=[...document.querySelectorAll('.runtime-batch-row')].map(row=>{const rec={recordTime:row.querySelector('.runtime-time').value};row.querySelectorAll('.runtime-value').forEach(inp=>rec[inp.dataset.key]=Number(inp.value));return rec});
   formMsg(isEdit?'Đang cập nhật...':'Đang lưu nhiều dòng...');
   if(isEdit) await request('update_runtime',{pin,type,rowId:editRecord.rowId,record:{...rows[0],userName:u.name,userRole:u.role}});
   else await request('save_runtime_batch',{pin,type,records:rows.map(r=>({...r,userName:u.name,userRole:u.role}))});
   formMsg(isEdit?'Đã cập nhật thành công.':`Đã lưu ${rows.length} dòng thành công.`,'ok');await loadRuntime();setTimeout(closeModal,650)
  }catch(err){formMsg(err.message,'error')}
 });
 bindLoginDefaults();$('#onlineCancel').onclick=closeModal;
 const add=$('#runtimeAddRow');if(add)add.onclick=()=>{const box=$('#runtimeRows'),i=box.querySelectorAll('.runtime-batch-row').length;box.insertAdjacentHTML('beforeend',runtimeRowFields(type,i,{recordTime:nowLocal}))};
 $('#runtimeRows').addEventListener('click',e=>{const b=e.target.closest('.runtime-remove-row');if(!b)return;const rows=$$('#runtimeRows .runtime-batch-row');if(rows.length===1){formMsg('Phải giữ ít nhất một dòng.','error');return}b.closest('.runtime-batch-row').remove();$$('#runtimeRows .runtime-batch-row').forEach((r,i)=>r.querySelector('.runtime-batch-head b').textContent='Dòng '+(i+1))});
}
function confirmDeleteRuntime(type,rowId){
 modal('XÓA DÒNG DỮ LIỆU',`${loginFields()}<p>Bạn có chắc muốn xóa dòng dữ liệu này không?</p><div id="onlineMessage" class="online-message"></div><div class="form-actions"><button type="button" class="secondary-btn" id="onlineCancel">HỦY</button><button type="submit" class="danger-btn">XÓA DÒNG</button></div>`,async ev=>{ev.preventDefault();const pin=$('#onlinePin').value.trim();if($('#onlineUser').value!==pin){formMsg('Người dùng và mã PIN không khớp.','error');return}try{localLogin(pin);formMsg('Đang xóa...');await request('delete_runtime',{pin,type,rowId});formMsg('Đã xóa dòng dữ liệu.','ok');await loadRuntime();setTimeout(closeModal,500)}catch(err){formMsg(err.message,'error')}});bindLoginDefaults();$('#onlineCancel').onclick=closeModal;
}
document.addEventListener('click',e=>{const b=e.target.closest('.runtime-add');if(b){e.preventDefault();openRuntime(b.dataset.runtime)}});
document.addEventListener('click',e=>{const edit=e.target.closest('[data-runtime-edit]');if(edit){e.preventDefault();const type=edit.dataset.runtimeEdit,row=(runtime[type]||[]).find(x=>String(x.rowId)===String(edit.dataset.rowId));if(row)openRuntime(type,row);return}const del=e.target.closest('[data-runtime-delete]');if(del){e.preventDefault();confirmDeleteRuntime(del.dataset.runtimeDelete,del.dataset.rowId)}});
function fmtTime(v){if(!v)return'—';const d=new Date(v);return isNaN(d)?v:d.toLocaleString('vi-VN')}
function renderRuntime(type){const rows=[...(runtime[type]||[])].sort((a,b)=>String(b.recordTime).localeCompare(String(a.recordTime))),defs=EQUIP[type];const body=$('#'+type+'RuntimeBody');body.innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(fmtTime(r.recordTime))}</b></td>${defs.map(d=>`<td>${Number(r[d.key]||0).toLocaleString('vi-VN',{maximumFractionDigits:1})} giờ</td>`).join('')}<td>${esc(r.userName||'—')}<br><small>${esc(r.userRole||'')}</small></td><td><div class="row-actions"><button class="secondary-btn mini" data-runtime-edit="${type}" data-row-id="${esc(r.rowId)}">Sửa</button><button class="danger-btn mini" data-runtime-delete="${type}" data-row-id="${esc(r.rowId)}">Xóa</button></div></td></tr>`).join(''):`<tr><td colspan="${defs.length+4}" class="empty">Chưa có dữ liệu Google Sheets.</td></tr>`;
 const latest=rows[0]||{};$('#'+type+'Kpis').innerHTML=defs.map(d=>`<article><span>${esc(d.label)}</span><strong>${latest[d.key]!==undefined?Number(latest[d.key]).toLocaleString('vi-VN',{maximumFractionDigits:1}):'—'}</strong><small>Giờ tích lũy / Total hours</small></article>`).join('');draw(type,rows.slice().reverse())}
function draw(type,rows){if(!window.Chart)return;const defs=EQUIP[type],labels=rows.map(r=>fmtTime(r.recordTime));const datasets=defs.map(d=>({label:d.label,data:rows.map(r=>Number(r[d.key]||0)),tension:.25,pointRadius:3}));['DashboardChart','Chart'].forEach(suffix=>{const id=type+suffix,canvas=$('#'+id);if(!canvas)return;if(charts[id])charts[id].destroy();charts[id]=new Chart(canvas,{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'}},scales:{y:{title:{display:true,text:'Operating hours'}}}}})})}
async function loadRuntime(){try{const d=await request('list_runtime');runtime.forklift=d.forklift||[];runtime.compressor=d.compressor||[];renderRuntime('forklift');renderRuntime('compressor')}catch(err){console.warn(err);renderRuntime('forklift');renderRuntime('compressor')}}
window.NEMS_READY.then(()=>{loadExplanations();loadStrategyChanges();loadRuntime()});
})();
