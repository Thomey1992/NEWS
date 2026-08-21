(function () {
  'use strict';

  // NEMS chỉ đọc JSON đã được GitHub Actions tạo tự động từ equipment.xlsx.
  // Không parse Excel trong trình duyệt => mở web nhanh và ổn định hơn.
  const RAW_JSON_URL = 'https://raw.githubusercontent.com/Thomey1992/NEWS/main/web-data/nems-data.json';
  const PAGE_JSON_URL = 'web-data/nems-data.json';

  function removeLoading() {
    const el = document.getElementById('loadingScreen');
    if (el) el.remove();
  }

  function showFatal(error) {
    const el = document.getElementById('loadingScreen');
    if (!el) return;
    el.innerHTML = `<div style="max-width:700px;padding:24px;text-align:center;font-family:Segoe UI,Arial;color:#991b1b">
      <h2>Không tải được dữ liệu NEMS</h2>
      <p>${String((error && error.message) || error || 'Unknown error')}</p>
      <p>Hãy kiểm tra <b>GitHub Actions → Update NEMS JSON data</b> và file <b>web-data/nems-data.json</b>.</p>
    </div>`;
  }

  function validate(data) {
    if (!data || !Array.isArray(data.equipment) || !Array.isArray(data.events)) {
      throw new Error('Dữ liệu JSON không đúng cấu trúc NEMS.');
    }
    return data;
  }

  async function fetchJson(url) {
    const sep = url.includes('?') ? '&' : '?';
    // Cache-busting: luôn hỏi phiên bản JSON mới nhất sau khi GitHub Actions cập nhật.
    const r = await fetch(url + sep + 'v=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} khi tải ${url}`);
    return validate(await r.json());
  }

  async function loadLatestJson() {
    let lastError = null;
    // RAW GitHub trước: nhận commit JSON mới nhanh hơn GitHub Pages deployment.
    for (const url of [RAW_JSON_URL, PAGE_JSON_URL]) {
      try {
        const data = await fetchJson(url);
        data.source = 'web-data/nems-data.json';
        data.sourceLabel = 'JSON tự động từ Excel';
        // generated là thời điểm GitHub Action chuyển equipment.xlsx -> JSON.
        data.loadedAt = data.generated || new Date().toISOString();
        return data;
      } catch (e) {
        lastError = e;
        console.warn('NEMS JSON source failed:', url, e);
      }
    }
    throw lastError || new Error('Không tải được JSON NEMS.');
  }

  window.NEMS_READY = (async function () {
    try {
      const data = await loadLatestJson();
      window.NEMS_DATA = data;
      removeLoading();
      return data;
    } catch (error) {
      showFatal(error);
      throw error;
    }
  })();
})();
