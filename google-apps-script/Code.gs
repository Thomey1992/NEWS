const TZ = 'Asia/Ho_Chi_Minh';
const TABLES = {
  plans: {name:'Maintenance_Plan', headers:['Plan_ID','EquipmentID','EquipmentName','Position','Plan_Start','Plan_End','Actual_Start','Actual_End','PIC','Status','Note','Created_At','Updated_At']},
  workorders: {name:'Work_Orders', headers:['WO_ID','Plan_ID','EquipmentID','Task','Assignee','Progress','Status','Created_At','Updated_At']},
  history: {name:'Maintenance_History', headers:['History_ID','Date','EquipmentID','WO_ID','Description','Result','Technician','Created_At']},
  users: {name:'Users', headers:['Username','Full_Name','PIN_Hash','Role','Active','Created_At','Updated_At']}
};

function doGet(){ return json_({ok:true,message:'NEMS Maintenance API V2 is running',version:'2.0'}); }
function doPost(e){
  try{
    const req=JSON.parse(e&&e.postData&&e.postData.contents?e.postData.contents:'{}');
    const action=String(req.action||'').trim();
    if(action==='login') return json_({ok:true,session:login_(req.username,req.pin)});
    const session=verifyToken_(req.token);
    if(action==='bootstrap') return json_({ok:true,plans:listPlans_(),workorders:listWorkOrders_(),history:listHistory_(),users:session.role==='admin'?listUsers_():[]});
    if(action==='savePlan'){requireRole_(session,['admin','technician']);return json_({ok:true,plan:savePlan_(req.plan||{},session)});}
    if(action==='deletePlan'){requireRole_(session,['admin']);deleteById_('plans',req.planId);return json_({ok:true});}
    if(action==='saveWorkOrder'){requireRole_(session,['admin','technician']);return json_({ok:true,workorder:saveWorkOrder_(req.workorder||{},session)});}
    if(action==='deleteWorkOrder'){requireRole_(session,['admin']);deleteById_('workorders',req.woId);return json_({ok:true});}
    if(action==='saveHistory'){requireRole_(session,['admin','technician']);return json_({ok:true,record:saveHistory_(req.record||{},session)});}
    if(action==='saveUser'){requireRole_(session,['admin']);return json_({ok:true,user:saveUser_(req.user||{})});}
    if(action==='logout'){CacheService.getScriptCache().remove('session:'+req.token);return json_({ok:true});}
    throw new Error('Hành động không hợp lệ.');
  }catch(err){return json_({ok:false,error:String(err.message||err)});}
}

function setupNEMS(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Hãy mở Apps Script từ Google Sheets.');
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(TABLES).forEach(k=>getSheet_(k));
  const users=getSheet_('users');
  if(users.getLastRow()<2){
    const now=now_();
    users.appendRow(['admin','NEMS Administrator',hash_('123456'),'admin',true,now,now]);
  }
  return 'Đã tạo Maintenance_Plan, Work_Orders, Maintenance_History và Users. Tài khoản mặc định: admin / 123456';
}

function getSheet_(key){
  const cfg=TABLES[key],ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(cfg.name);
  if(!sh){sh=ss.insertSheet(cfg.name);sh.getRange(1,1,1,cfg.headers.length).setValues([cfg.headers]);}
  const current=sh.getRange(1,1,1,cfg.headers.length).getDisplayValues()[0];
  if(current.join('|')!==cfg.headers.join('|')) sh.getRange(1,1,1,cfg.headers.length).setValues([cfg.headers]);
  sh.setFrozenRows(1);sh.getRange(1,1,1,cfg.headers.length).setFontWeight('bold').setBackground('#064e3b').setFontColor('#ffffff');
  return sh;
}
function rows_(key){const sh=getSheet_(key),n=sh.getLastRow();return n<2?[]:sh.getRange(2,1,n-1,TABLES[key].headers.length).getDisplayValues().filter(r=>r[0]);}
function now_(){return Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd HH:mm:ss');}
function id_(prefix){return prefix+'-'+Utilities.formatDate(new Date(),TZ,'yyyyMMdd-HHmmss')+'-'+Math.floor(Math.random()*900+100);}
function hash_(s){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s));return bytes.map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join('');}

function login_(username,pin){
  username=String(username||'').trim().toLowerCase();
  const row=rows_('users').find(r=>String(r[0]).toLowerCase()===username);
  if(!row||String(row[4]).toLowerCase()==='false'||row[4]==='0') throw new Error('Tài khoản không tồn tại hoặc đã bị khóa.');
  if(row[2]!==hash_(pin)) throw new Error('Mã PIN không đúng.');
  const token=Utilities.getUuid()+Utilities.getUuid();
  const session={token,username:row[0],fullName:row[1],role:row[3],expiresAt:Date.now()+21600000};
  CacheService.getScriptCache().put('session:'+token,JSON.stringify(session),21600);
  return session;
}
function verifyToken_(token){if(!token)throw new Error('Bạn chưa đăng nhập.');const raw=CacheService.getScriptCache().get('session:'+token);if(!raw)throw new Error('Phiên đăng nhập đã hết hạn.');return JSON.parse(raw);}
function requireRole_(s,roles){if(!roles.includes(s.role))throw new Error('Bạn không có quyền thực hiện thao tác này.');}

function listPlans_(){return rows_('plans').map(r=>({planId:r[0],asset:r[1],equipmentName:r[2],position:r[3],planStart:r[4],planEnd:r[5],actualStart:r[6],actualEnd:r[7],pic:r[8],status:r[9]||'planned',note:r[10],createdAt:r[11],updatedAt:r[12]}));}
function savePlan_(p,s){
  if(!p.asset||!p.planStart||!p.planEnd)throw new Error('Thiếu thiết bị hoặc ngày kế hoạch.');
  if(p.planEnd<p.planStart)throw new Error('Ngày kết thúc kế hoạch không được trước ngày bắt đầu.');
  if(p.actualStart&&p.actualEnd&&p.actualEnd<p.actualStart)throw new Error('Ngày thực tế kết thúc không hợp lệ.');
  const sh=getSheet_('plans'),ids=rows_('plans').map(r=>r[0]);let pid=String(p.planId||'').trim(),idx=ids.indexOf(pid),created=now_();
  if(idx>=0)created=sh.getRange(idx+2,12).getDisplayValue()||created; if(!pid)pid=id_('PM');
  let status=p.actualEnd?'completed':p.actualStart?'in-progress':(p.planEnd<Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd')?'overdue':'planned');
  const row=[pid,p.asset,p.equipmentName||'',p.position||'',p.planStart,p.planEnd,p.actualStart||'',p.actualEnd||'',p.pic||'',status,p.note||'',created,now_()];
  if(idx>=0)sh.getRange(idx+2,1,1,row.length).setValues([row]);else sh.appendRow(row);
  return listPlans_().find(x=>x.planId===pid);
}
function listWorkOrders_(){return rows_('workorders').map(r=>({woId:r[0],planId:r[1],asset:r[2],task:r[3],assignee:r[4],progress:Number(r[5]||0),status:r[6]||'open',createdAt:r[7],updatedAt:r[8]}));}
function saveWorkOrder_(w,s){
  if(!w.asset||!w.task)throw new Error('Thiếu thiết bị hoặc nội dung công việc.');
  const sh=getSheet_('workorders'),ids=rows_('workorders').map(r=>r[0]);let wid=String(w.woId||'').trim(),idx=ids.indexOf(wid),created=now_();if(idx>=0)created=sh.getRange(idx+2,8).getDisplayValue()||created;if(!wid)wid=id_('WO');
  const progress=Math.max(0,Math.min(100,Number(w.progress||0)));let status=w.status||'open';if(progress>=100)status='done';
  const row=[wid,w.planId||'',w.asset,w.task,w.assignee||'',progress,status,created,now_()];if(idx>=0)sh.getRange(idx+2,1,1,row.length).setValues([row]);else sh.appendRow(row);return listWorkOrders_().find(x=>x.woId===wid);
}
function listHistory_(){return rows_('history').map(r=>({historyId:r[0],date:r[1],asset:r[2],woId:r[3],description:r[4],result:r[5],technician:r[6],createdAt:r[7]})).sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
function saveHistory_(h,s){if(!h.date||!h.asset||!h.description)throw new Error('Thiếu ngày, thiết bị hoặc nội dung.');const row=[id_('MH'),h.date,h.asset,h.woId||'',h.description,h.result||'',h.technician||s.fullName,now_()];getSheet_('history').appendRow(row);return listHistory_()[0];}
function listUsers_(){return rows_('users').map(r=>({username:r[0],fullName:r[1],role:r[3],active:String(r[4]).toLowerCase()!=='false'&&r[4]!=='0',createdAt:r[5],updatedAt:r[6]}));}
function saveUser_(u){
  const username=String(u.username||'').trim().toLowerCase();if(!username||!u.fullName)throw new Error('Thiếu tài khoản hoặc họ tên.');if(!['admin','technician','viewer'].includes(u.role))throw new Error('Vai trò không hợp lệ.');
  const sh=getSheet_('users'),data=rows_('users'),idx=data.findIndex(r=>String(r[0]).toLowerCase()===username),now=now_();let hash=idx>=0?data[idx][2]:'';if(u.pin)hash=hash_(u.pin);if(!hash)throw new Error('Người dùng mới phải có mã PIN.');let created=idx>=0?data[idx][5]:now;const row=[username,u.fullName,hash,u.role,String(u.active)!=='false',created,now];if(idx>=0)sh.getRange(idx+2,1,1,row.length).setValues([row]);else sh.appendRow(row);return listUsers_().find(x=>x.username===username);
}
function deleteById_(key,id){const sh=getSheet_(key),ids=rows_(key).map(r=>r[0]),idx=ids.indexOf(String(id||''));if(idx<0)throw new Error('Không tìm thấy dữ liệu.');sh.deleteRow(idx+2);}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
