
(function(){
  const clean = v => (v == null ? "" : String(v)).trim();
  const norm = s => clean(s).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/\s+/g," ");

  function val(row, aliases){
    const keys = Object.keys(row);
    for(const alias of aliases){
      const na = norm(alias);
      const exact = keys.find(k => norm(k) === na);
      if(exact) return row[exact];
    }
    for(const alias of aliases){
      const na = norm(alias);
      const partial = keys.find(k => norm(k).includes(na));
      if(partial) return row[partial];
    }
    return "";
  }

  function dateValue(v){
    if(v instanceof Date && !isNaN(v)) {
      const y=v.getFullYear(), m=String(v.getMonth()+1).padStart(2,"0"), d=String(v.getDate()).padStart(2,"0");
      return `${y}-${m}-${d}`;
    }
    if(typeof v === "number" && window.XLSX?.SSF?.parse_date_code){
      const p=XLSX.SSF.parse_date_code(v);
      if(p) return `${p.y}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`;
    }
    return clean(v);
  }

  function rowsFromSheet(wb, sheetName){
    const ws=wb.Sheets[sheetName];
    if(!ws) throw new Error(`Không tìm thấy sheet "${sheetName}"`);
    return XLSX.utils.sheet_to_json(ws,{defval:"",raw:true});
  }

  window.NEMS_READY = (async function(){
    try{
      // Cache-buster ensures the browser receives today's newly uploaded Excel file.
      const res=await fetch("equipment.xlsx?v="+Date.now(),{cache:"no-store"});
      if(!res.ok) throw new Error("Không tải được equipment.xlsx ("+res.status+")");
      const buf=await res.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array",cellDates:true});

      const er=rowsFromSheet(wb,"Equipment_Register");
      const lr=rowsFromSheet(wb,"Asset_Event_Log1");

      const equipment=er.map(r=>({
        no: clean(val(r,["No."])),
        category: clean(val(r,["Phân loại"])),
        asset: clean(val(r,["Mã tài sản"])),
        assetName: clean(val(r,["Tên Theo mã tài sản","Tên theo mã tài sản"])),
        name: clean(val(r,["TÊN Name","TÊN","Name"])),
        model: clean(val(r,["MODEL","Model"])),
        serial: clean(val(r,["Serial"])),
        parameter: clean(val(r,["THÔNG SỐ KỸ THUẬT Parameter","THÔNG SỐ KỸ THUẬT"])),
        qty: clean(val(r,["SỐ LƯỢNG Quantity","SỐ LƯỢNG"])),
        manufacturer: clean(val(r,["HÃNG SX Manufacturer","HÃNG SX"])),
        vendor: clean(val(r,["NHÀ CUNG CẤP Vendor","NHÀ CUNG CẤP"])),
        year: dateValue(val(r,["Năm sản xuất"])),
        position: clean(val(r,["VỊ TRÍ LẮP ĐẶT Position","VỊ TRÍ LẮP ĐẶT"])),
        maintenanceCycle: clean(val(r,["CHU KỲ BẢO DƯỠNG Maintenance cycle","CHU KỲ BẢO DƯỠNG"])),
        installationDate: dateValue(val(r,["NGÀY LẮP ĐẶT Installation date","NGÀY LẮP ĐẶT"])),
        accreditation: dateValue(val(r,["KIỂM ĐỊNH Accreditation","KIỂM ĐỊNH"])),
        calibration: dateValue(val(r,["Hiệu chuẩn Calibration","Hiệu chuẩn"])),
        note: clean(val(r,["GHI CHÚ Note","GHI CHÚ"])),
        image: clean(val(r,["Hình ảnh"])),
        document: clean(val(r,["Document"]))
      })).filter(e=>e.asset && e.name);

      const events=lr.map(r=>{
        const assetAuto=clean(val(r,["Mã tài sản tự điền"]));
        const nameAuto=clean(val(r,["Tên thiết bị đúng DS"]));
        const modelAuto=clean(val(r,["Model tự điền"]));
        const assetNameAuto=clean(val(r,["Tên theo mã tài sản tự điền"]));
        const serialAuto=clean(val(r,["Serial tự điền"]));
        const approval=clean(val(r,["Trạng thái duyệt"]));
        const approver=clean(val(r,["Người duyệt"]));
        return {
          id: clean(val(r,["ID"])),
          date: dateValue(val(r,["Ngày nhận thông tin"])),
          area: clean(val(r,["Vị trí khu vực"])),
          asset: assetAuto || clean(val(r,["Mã tài sản"])),
          assetName: assetNameAuto || clean(val(r,["Tên theo mã tài sản"])),
          name: nameAuto || clean(val(r,["Tên thiết bị"])),
          model: modelAuto || clean(val(r,["Model"])),
          serial: serialAuto || clean(val(r,["Số Serial"])),
          eventType: clean(val(r,["Loại trạng thái/sự kiện"])),
          description: clean(val(r,["Nôi dung thông tin","Nội dung thông tin"])),
          technician: clean(val(r,["Người phụ trách thực hiện"])),
          result: clean(val(r,["Kết quả"])),
          downtime: clean(val(r,["Downtime (Phút)","Downtime"])),
          cause: clean(val(r,["Nguyên Nhân","Nguyên nhân"])),
          note: clean(val(r,["Ghi chú"])),
          approval,
          approver: (norm(approval).includes("duyet") || approver) ? approver : ""
        };
      }).filter(e=>e.asset && (e.date || e.eventType || e.description));

      const data={
        generated:new Date().toLocaleString("vi-VN"),
        equipment,
        events
      };
      window.NEMS_DATA=data;
      const loading=document.getElementById("loadingScreen");
      if(loading) loading.remove();
      return data;
    }catch(err){
      console.error(err);
      const loading=document.getElementById("loadingScreen");
      if(loading){
        loading.innerHTML=`<div style="max-width:650px;padding:24px;text-align:center;font-family:Segoe UI,Arial;color:#991b1b">
          <h2>Không đọc được file Excel</h2>
          <p>${String(err.message||err)}</p>
          <p>Kiểm tra file phải có tên <b>equipment.xlsx</b> và giữ nguyên sheet <b>Equipment_Register</b> + <b>Asset_Event_Log1</b>.</p>
        </div>`;
      }
      throw err;
    }
  })();
})();
