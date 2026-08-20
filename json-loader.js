(function () {
  const EXCEL_URL = "equipment.xlsx";
  const RAW_JSON_URL = "https://raw.githubusercontent.com/Thomey1992/NEWS/main/web-data/nems-data.json";
  const PAGE_JSON_URL = "web-data/nems-data.json";
  const POLL_MS = 60 * 1000;

  const clean = v => (v == null ? "" : String(v)).trim();
  const norm = s => clean(s).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ");

  function val(row, aliases) {
    const keys = Object.keys(row || {});
    for (const alias of aliases) {
      const na = norm(alias);
      const exact = keys.find(k => norm(k) === na);
      if (exact) return row[exact];
    }
    for (const alias of aliases) {
      const na = norm(alias);
      const partial = keys.find(k => norm(k).includes(na));
      if (partial) return row[partial];
    }
    return "";
  }

  function dateValue(v) {
    if (v instanceof Date && !isNaN(v)) {
      const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, "0"), d = String(v.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof v === "number" && window.XLSX?.SSF?.parse_date_code) {
      const p = XLSX.SSF.parse_date_code(v);
      if (p) return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    }
    return clean(v);
  }

  function rowsFromSheet(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Không tìm thấy sheet "${sheetName}"`);
    return XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
  }

  function revisionFromResponse(response) {
    return [
      response.headers.get("etag") || "",
      response.headers.get("last-modified") || "",
      response.headers.get("content-length") || ""
    ].join("|");
  }

  async function loadExcel() {
    if (!window.XLSX) throw new Error("Chưa tải được thư viện đọc Excel (XLSX).");
    const separator = EXCEL_URL.includes("?") ? "&" : "?";
    const response = await fetch(EXCEL_URL + separator + "v=" + Date.now(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
    });
    if (!response.ok) throw new Error("Không tải được equipment.xlsx (HTTP " + response.status + ")");

    const revision = revisionFromResponse(response);
    const buf = await response.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const er = rowsFromSheet(wb, "Equipment_Register");
    const lr = rowsFromSheet(wb, "Asset_Event_Log1");

    const equipment = er.map(r => ({
      no: clean(val(r, ["No."])),
      category: clean(val(r, ["Phân loại"])),
      asset: clean(val(r, ["Mã tài sản"])),
      assetName: clean(val(r, ["Tên Theo mã tài sản", "Tên theo mã tài sản"])),
      name: clean(val(r, ["TÊN Name", "TÊN", "Name"])),
      model: clean(val(r, ["MODEL", "Model"])),
      serial: clean(val(r, ["Serial"])),
      parameter: clean(val(r, ["THÔNG SỐ KỸ THUẬT Parameter", "THÔNG SỐ KỸ THUẬT"])),
      qty: clean(val(r, ["SỐ LƯỢNG Quantity", "SỐ LƯỢNG"])),
      manufacturer: clean(val(r, ["HÃNG SX Manufacturer", "HÃNG SX"])),
      vendor: clean(val(r, ["NHÀ CUNG CẤP Vendor", "NHÀ CUNG CẤP"])),
      year: dateValue(val(r, ["Năm sản xuất"])),
      position: clean(val(r, ["VỊ TRÍ LẮP ĐẶT Position", "VỊ TRÍ LẮP ĐẶT"])),
      maintenanceCycle: clean(val(r, ["CHU KỲ BẢO DƯỠNG Maintenance cycle", "CHU KỲ BẢO DƯỠNG"])),
      installationDate: dateValue(val(r, ["NGÀY LẮP ĐẶT Installation date", "NGÀY LẮP ĐẶT"])),
      accreditation: dateValue(val(r, ["KIỂM ĐỊNH Accreditation", "KIỂM ĐỊNH"])),
      calibration: dateValue(val(r, ["Hiệu chuẩn Calibration", "Hiệu chuẩn"])),
      note: clean(val(r, ["GHI CHÚ Note", "GHI CHÚ"])),
      image: clean(val(r, ["Hình ảnh"])),
      document: clean(val(r, ["Document"]))
    })).filter(e => e.asset && e.name);

    const events = lr.map(r => {
      const assetAuto = clean(val(r, ["Mã tài sản tự điền"]));
      const nameAuto = clean(val(r, ["Tên thiết bị đúng DS"]));
      const modelAuto = clean(val(r, ["Model tự điền"]));
      const assetNameAuto = clean(val(r, ["Tên theo mã tài sản tự điền"]));
      const serialAuto = clean(val(r, ["Serial tự điền"]));
      const approval = clean(val(r, ["Trạng thái duyệt"]));
      const approver = clean(val(r, ["Người duyệt"]));
      return {
        id: clean(val(r, ["ID"])),
        date: dateValue(val(r, ["Ngày nhận thông tin"])),
        area: clean(val(r, ["Vị trí khu vực"])),
        asset: assetAuto || clean(val(r, ["Mã tài sản"])),
        assetName: assetNameAuto || clean(val(r, ["Tên theo mã tài sản"])),
        name: nameAuto || clean(val(r, ["Tên thiết bị"])),
        model: modelAuto || clean(val(r, ["Model"])),
        serial: serialAuto || clean(val(r, ["Số Serial"])),
        eventType: clean(val(r, ["Loại trạng thái/sự kiện"])),
        description: clean(val(r, ["Nôi dung thông tin", "Nội dung thông tin"])),
        technician: clean(val(r, ["Người phụ trách thực hiện"])),
        result: clean(val(r, ["Kết quả"])),
        downtime: clean(val(r, ["Downtime (Phút)", "Downtime"])),
        cause: clean(val(r, ["Nguyên Nhân", "Nguyên nhân"])),
        note: clean(val(r, ["Ghi chú"])),
        approval,
        approver: (norm(approval).includes("duyet") || approver) ? approver : ""
      };
    }).filter(e => e.asset && (e.date || e.eventType || e.description));

    const loadedAt = new Date().toISOString();
    return {
      generated: loadedAt,
      loadedAt,
      source: "equipment.xlsx",
      sourceLabel: "Excel GitHub",
      revision,
      equipment,
      events
    };
  }

  async function loadJson(url) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(url + separator + "v=" + Date.now(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error("HTTP " + response.status + " khi tải " + url);
    const data = await response.json();
    if (!data || !Array.isArray(data.equipment) || !Array.isArray(data.events)) {
      throw new Error("Dữ liệu JSON không đúng cấu trúc NEMS.");
    }
    data.source = "web-data/nems-data.json";
    data.sourceLabel = "JSON dự phòng";
    data.loadedAt = new Date().toISOString();
    return data;
  }

  function removeLoading() {
    const loading = document.getElementById("loadingScreen");
    if (loading) loading.remove();
  }

  function showFatal(error) {
    const loading = document.getElementById("loadingScreen");
    if (loading) {
      loading.innerHTML = `<div style="max-width:650px;padding:24px;text-align:center;font-family:Segoe UI,Arial;color:#991b1b">
        <h2>Không tải được dữ liệu NEMS</h2>
        <p>${String((error && error.message) || error || "Unknown error")}</p>
        <p>Kiểm tra file <b>equipment.xlsx</b> và hai sheet <b>Equipment_Register</b>, <b>Asset_Event_Log1</b>.</p>
      </div>`;
    }
  }

  function startExcelRevisionMonitor(initialRevision) {
    if (!initialRevision) return;
    let currentRevision = initialRevision;
    setInterval(async () => {
      try {
        const sep = EXCEL_URL.includes("?") ? "&" : "?";
        const r = await fetch(EXCEL_URL + sep + "check=" + Date.now(), {
          method: "HEAD",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
        });
        if (!r.ok) return;
        const nextRevision = revisionFromResponse(r);
        if (nextRevision && nextRevision !== currentRevision) {
          currentRevision = nextRevision;
          const el = document.getElementById("lastDataUpdate");
          if (el) el.textContent = "Phát hiện equipment.xlsx mới – đang tải lại...";
          setTimeout(() => location.reload(), 600);
        }
      } catch (e) {
        console.warn("Không kiểm tra được phiên bản equipment.xlsx:", e);
      }
    }, POLL_MS);
  }

  window.NEMS_READY = (async function () {
    let lastError;
    try {
      const data = await loadExcel();
      window.NEMS_DATA = data;
      removeLoading();
      startExcelRevisionMonitor(data.revision);
      return data;
    } catch (error) {
      lastError = error;
      console.warn("Excel source failed, chuyển sang JSON dự phòng:", error);
    }

    for (const url of [RAW_JSON_URL, PAGE_JSON_URL]) {
      try {
        const data = await loadJson(url);
        window.NEMS_DATA = data;
        removeLoading();
        return data;
      } catch (error) {
        lastError = error;
        console.warn("NEMS JSON source failed:", url, error);
      }
    }

    showFatal(lastError);
    throw lastError;
  })();
})();
