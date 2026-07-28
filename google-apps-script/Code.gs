const USERS = {
  '1369': {name:'Thomey', role:'Head of Engineering Department'},
  '3617': {name:'Nguyễn Văn Khang', role:'Engineer'},
  '3836': {name:'Nguyễn Hoàng Đức', role:'Engineer'},
  '2243': {name:'Phạm Thế Hòa', role:'Experienced Technician'}
};
const EX_SHEET='PM_Explanation';
const FORKLIFT_SHEET='Forklift_Runtime';
const COMPRESSOR_SHEET='Compressor_Runtime';
const EX_HEADERS=['Timestamp','EquipmentID','EquipmentName','Area','Model','Serial','Reason','Planned_PM_Date','Temporary_Control','User_Name','User_Role'];
const FORKLIFT_HEADERS=['Timestamp','Record_Time','2113000110-0_Toyota_8FBR18','2113000105-0_Toyota_LWE200','User_Name','User_Role'];
const COMPRESSOR_HEADERS=['Timestamp','Record_Time','Air_Compressor_5_DB001','Air_Compressor_6_DB002','Air_Compressor_4_C4HC42113','User_Name','User_Role'];
function doGet(){return json_({ok:true,message:'NEMS Online API is running'});}
function doPost(e){
 try{
  const req=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
  const a=String(req.action||'').toLowerCase();
  if(a==='list_explanations')return json_({ok:true,records:listObjects_(sheet_(EX_SHEET,EX_HEADERS))});
  if(a==='list_runtime')return json_({ok:true,forklift:listRuntime_(FORKLIFT_SHEET,FORKLIFT_HEADERS,'forklift'),compressor:listRuntime_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS,'compressor')});
  const user=verifyUser_(req.pin);
  if(a==='save_explanation'){saveExplanation_(req.record||{},user);return json_({ok:true});}
  if(a==='save_runtime'){saveRuntime_(String(req.type||''),req.record||{},user);return json_({ok:true});}
  throw new Error('Action không hợp lệ.');
 }catch(err){return json_({ok:false,error:String(err.message||err)});}
}
function setupNEMSOnline(){sheet_(EX_SHEET,EX_HEADERS);sheet_(FORKLIFT_SHEET,FORKLIFT_HEADERS);sheet_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS);return 'Đã tạo 3 sheet NEMS Online.';}
function verifyUser_(pin){const u=USERS[String(pin||'')];if(!u)throw new Error('Mã PIN không đúng hoặc không có quyền.');return u;}
function sheet_(name,headers){const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('Hãy mở Apps Script từ Google Sheets.');let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#064e3b').setFontColor('#fff');sh.autoResizeColumns(1,headers.length);}return sh;}
function now_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss');}
function saveExplanation_(r,u){if(!r.asset||!r.reason||!r.plannedDate||!r.temporaryControl)throw new Error('Thiếu nội dung giải trình.');sheet_(EX_SHEET,EX_HEADERS).appendRow([now_(),r.asset,r.equipmentName||'',r.area||'',r.model||'',r.serial||'',r.reason,r.plannedDate,r.temporaryControl,u.name,u.role]);}
function saveRuntime_(type,r,u){if(!r.recordTime)throw new Error('Thiếu thời gian ghi nhận.');if(type==='forklift'){sheet_(FORKLIFT_SHEET,FORKLIFT_HEADERS).appendRow([now_(),r.recordTime,num_(r.forklift1),num_(r.forklift2),u.name,u.role]);return;}if(type==='compressor'){sheet_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS).appendRow([now_(),r.recordTime,num_(r.compressor5),num_(r.compressor6),num_(r.compressor4),u.name,u.role]);return;}throw new Error('Loại dữ liệu không hợp lệ.');}
function num_(v){const n=Number(v);if(!isFinite(n)||n<0)throw new Error('Số giờ không hợp lệ.');return n;}
function listObjects_(sh){const lr=sh.getLastRow();if(lr<2)return[];return sh.getRange(2,1,lr-1,EX_HEADERS.length).getDisplayValues().map(r=>({timestamp:r[0],asset:r[1],equipmentName:r[2],area:r[3],model:r[4],serial:r[5],reason:r[6],plannedDate:r[7],temporaryControl:r[8],userName:r[9],userRole:r[10]}));}
function listRuntime_(name,headers,type){const sh=sheet_(name,headers),lr=sh.getLastRow();if(lr<2)return[];return sh.getRange(2,1,lr-1,headers.length).getDisplayValues().map(r=>type==='forklift'?{timestamp:r[0],recordTime:r[1],forklift1:r[2],forklift2:r[3],userName:r[4],userRole:r[5]}:{timestamp:r[0],recordTime:r[1],compressor5:r[2],compressor6:r[3],compressor4:r[4],userName:r[5],userRole:r[6]});}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
