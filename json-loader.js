(function () {
  const RAW_DATA_URL = "https://raw.githubusercontent.com/Thomey1992/NEWS/main/web-data/nems-data.json";
  const PAGE_DATA_URL = "web-data/nems-data.json";

  async function loadJson(url) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(url + separator + "v=" + Date.now(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " khi tải " + url);
    }
    return response.json();
  }

  function validate(data) {
    if (!data || !Array.isArray(data.equipment) || !Array.isArray(data.events)) {
      throw new Error("Dữ liệu JSON không đúng cấu trúc NEMS.");
    }
    return data;
  }

  window.NEMS_READY = (async function () {
    let lastError;
    for (const url of [RAW_DATA_URL, PAGE_DATA_URL]) {
      try {
        const data = validate(await loadJson(url));
        window.NEMS_DATA = data;
        const loading = document.getElementById("loadingScreen");
        if (loading) loading.remove();
        return data;
      } catch (error) {
        lastError = error;
        console.warn("NEMS data source failed:", url, error);
      }
    }

    const loading = document.getElementById("loadingScreen");
    if (loading) {
      loading.innerHTML = `<div style="max-width:650px;padding:24px;text-align:center;font-family:Segoe UI,Arial;color:#991b1b">
        <h2>Không tải được dữ liệu NEMS</h2>
        <p>${String((lastError && lastError.message) || lastError || "Unknown error")}</p>
        <p>Vui lòng tải lại trang sau khi GitHub Actions hoàn tất.</p>
      </div>`;
    }
    throw lastError;
  })();
})();
