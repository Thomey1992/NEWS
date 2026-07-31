const USERS = {
  '1369': {name:'Thomey', role:'Head of Engineering Department'},
  '3617': {name:'Nguyễn Văn Khang', role:'Engineer'},
  '3836': {name:'Nguyễn Hoàng Đức', role:'Engineer'},
  '2243': {name:'Phạm Thế Hòa', role:'Experienced Technician'}
};
const EX_SHEET='PM_Explanation';
const FORKLIFT_SHEET='Forklift_Runtime';
const COMPRESSOR_SHEET='Compressor_Runtime';
const STRATEGY_SHEET='Maintenance_Strategy_Change';
const EX_HEADERS=['Timestamp','EquipmentID','EquipmentName','Area','Model','Serial','Reason','Planned_PM_Date','Temporary_Control','User_Name','User_Role'];
const FORKLIFT_HEADERS=['Timestamp','Record_Time','2113000110-0_Toyota_8FBR18','2113000105-0_Toyota_LWE200','User_Name','User_Role'];
const COMPRESSOR_HEADERS=['Timestamp','Record_Time','Air_Compressor_5_DB001','Air_Compressor_6_DB002','Air_Compressor_4_C4HC42113','User_Name','User_Role'];
const STRATEGY_HEADERS=['Timestamp','Effective_Date','EquipmentID','EquipmentName','Area','Old_Cycle','New_Cycle','Reason','Risk_Assessment','Temporary_Control','Approver','User_Name','User_Role'];
function doGet(){return json_({ok:true,message:'NEMS Online API is running'});}
function doPost(e){
 try{
  const req=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
  const a=String(req.action||'').toLowerCase();
  if(a==='list_explanations')return json_({ok:true,records:listObjects_(sheet_(EX_SHEET,EX_HEADERS))});
  if(a==='list_runtime')return json_({ok:true,forklift:listRuntime_(FORKLIFT_SHEET,FORKLIFT_HEADERS,'forklift'),compressor:listRuntime_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS,'compressor')});
  if(a==='list_strategy_changes')return json_({ok:true,records:listStrategyChanges_()});
  const user=verifyUser_(req.pin);
  if(a==='save_explanation'){saveExplanation_(req.record||{},user);return json_({ok:true});}
  if(a==='save_strategy_change'){saveStrategyChange_(req.record||{},user);return json_({ok:true});}
  if(a==='save_runtime'){saveRuntime_(String(req.type||''),req.record||{},user);return json_({ok:true});}
  if(a==='save_runtime_batch'){saveRuntimeBatch_(String(req.type||''),req.records||[],user);return json_({ok:true});}
  if(a==='update_runtime'){updateRuntime_(String(req.type||''),req.rowId,req.record||{},user);return json_({ok:true});}
  if(a==='delete_runtime'){deleteRuntime_(String(req.type||''),req.rowId,user);return json_({ok:true});}
  throw new Error('Action không hợp lệ.');
 }catch(err){return json_({ok:false,error:String(err.message||err)});}
}
function setupNEMSOnline(){sheet_(EX_SHEET,EX_HEADERS);sheet_(FORKLIFT_SHEET,FORKLIFT_HEADERS);sheet_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS);sheet_(STRATEGY_SHEET,STRATEGY_HEADERS);return 'Đã tạo 4 sheet NEMS Online.';}
function verifyUser_(pin){const u=USERS[String(pin||'')];if(!u)throw new Error('Mã PIN không đúng hoặc không có quyền.');return u;}
function sheet_(name,headers){const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('Hãy mở Apps Script từ Google Sheets.');let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#064e3b').setFontColor('#fff');sh.autoResizeColumns(1,headers.length);}return sh;}
function now_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss');}
function saveExplanation_(r,u){if(!r.asset||!r.reason||!r.plannedDate||!r.temporaryControl)throw new Error('Thiếu nội dung giải trình.');sheet_(EX_SHEET,EX_HEADERS).appendRow([now_(),r.asset,r.equipmentName||'',r.area||'',r.model||'',r.serial||'',r.reason,r.plannedDate,r.temporaryControl,u.name,u.role]);}

function saveStrategyChange_(r,u){
 if(!r.asset||!r.effectiveDate||!r.oldCycle||!r.newCycle||!r.reason||!r.riskAssessment||!r.temporaryControl||!r.approver)throw new Error('Thiếu nội dung chuyển đổi chiến lược bảo trì.');
 sheet_(STRATEGY_SHEET,STRATEGY_HEADERS).appendRow([now_(),r.effectiveDate,r.asset,r.equipmentName||'',r.area||'',r.oldCycle,r.newCycle,r.reason,r.riskAssessment,r.temporaryControl,r.approver,u.name,u.role]);
}
function listStrategyChanges_(){
 const sh=sheet_(STRATEGY_SHEET,STRATEGY_HEADERS),lr=sh.getLastRow();if(lr<2)return[];
 return sh.getRange(2,1,lr-1,STRATEGY_HEADERS.length).getDisplayValues().map(r=>({timestamp:r[0],effectiveDate:r[1],asset:r[2],equipmentName:r[3],area:r[4],oldCycle:r[5],newCycle:r[6],reason:r[7],riskAssessment:r[8],temporaryControl:r[9],approver:r[10],userName:r[11],userRole:r[12]}));
}

function saveRuntime_(type,r,u){if(!r.recordTime)throw new Error('Thiếu thời gian ghi nhận.');if(type==='forklift'){sheet_(FORKLIFT_SHEET,FORKLIFT_HEADERS).appendRow([now_(),r.recordTime,num_(r.forklift1),num_(r.forklift2),u.name,u.role]);return;}if(type==='compressor'){sheet_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS).appendRow([now_(),r.recordTime,num_(r.compressor5),num_(r.compressor6),num_(r.compressor4),u.name,u.role]);return;}throw new Error('Loại dữ liệu không hợp lệ.');}

function saveRuntimeBatch_(type,records,u){if(!Array.isArray(records)||!records.length)throw new Error('Không có dữ liệu để lưu.');if(records.length>100)throw new Error('Mỗi lần chỉ nhập tối đa 100 dòng.');const sh=type==='forklift'?sheet_(FORKLIFT_SHEET,FORKLIFT_HEADERS):type==='compressor'?sheet_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS):null;if(!sh)throw new Error('Loại dữ liệu không hợp lệ.');const rows=records.map(r=>{if(!r.recordTime)throw new Error('Có dòng thiếu thời gian ghi nhận.');return type==='forklift'?[now_(),r.recordTime,num_(r.forklift1),num_(r.forklift2),u.name,u.role]:[now_(),r.recordTime,num_(r.compressor5),num_(r.compressor6),num_(r.compressor4),u.name,u.role];});sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);}
function runtimeSheetInfo_(type){if(type==='forklift')return{sh:sheet_(FORKLIFT_SHEET,FORKLIFT_HEADERS),headers:FORKLIFT_HEADERS};if(type==='compressor')return{sh:sheet_(COMPRESSOR_SHEET,COMPRESSOR_HEADERS),headers:COMPRESSOR_HEADERS};throw new Error('Loại dữ liệu không hợp lệ.');}
function updateRuntime_(type,rowId,r,u){const info=runtimeSheetInfo_(type),row=Number(rowId);if(!Number.isInteger(row)||row<2||row>info.sh.getLastRow())throw new Error('Không tìm thấy dòng cần sửa.');if(!r.recordTime)throw new Error('Thiếu thời gian ghi nhận.');const values=type==='forklift'?[now_(),r.recordTime,num_(r.forklift1),num_(r.forklift2),u.name,u.role]:[now_(),r.recordTime,num_(r.compressor5),num_(r.compressor6),num_(r.compressor4),u.name,u.role];info.sh.getRange(row,1,1,values.length).setValues([values]);}
function deleteRuntime_(type,rowId,u){const info=runtimeSheetInfo_(type),row=Number(rowId);if(!Number.isInteger(row)||row<2||row>info.sh.getLastRow())throw new Error('Không tìm thấy dòng cần xóa.');info.sh.deleteRow(row);}

function num_(v){const n=Number(v);if(!isFinite(n)||n<0)throw new Error('Số giờ không hợp lệ.');return n;}
function listObjects_(sh){const lr=sh.getLastRow();if(lr<2)return[];return sh.getRange(2,1,lr-1,EX_HEADERS.length).getDisplayValues().map(r=>({timestamp:r[0],asset:r[1],equipmentName:r[2],area:r[3],model:r[4],serial:r[5],reason:r[6],plannedDate:r[7],temporaryControl:r[8],userName:r[9],userRole:r[10]}));}
function listRuntime_(name,headers,type){const sh=sheet_(name,headers),lr=sh.getLastRow();if(lr<2)return[];return sh.getRange(2,1,lr-1,headers.length).getDisplayValues().map((r,i)=>type==='forklift'?{rowId:i+2,timestamp:r[0],recordTime:r[1],forklift1:r[2],forklift2:r[3],userName:r[4],userRole:r[5]}:{rowId:i+2,timestamp:r[0],recordTime:r[1],compressor5:r[2],compressor6:r[3],compressor4:r[4],userName:r[5],userRole:r[6]});}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
