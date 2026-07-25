(function(){
  // Data is fetched directly from the main branch, so daily updates do not
  // need to wait for GitHub Pages to redeploy the whole website.
  const DATA_URL = "https://raw.githubusercontent.com/Thomey1992/NEWS/main/web-data/nems-data.json";

  window.NEMS_READY = (async function(){
    try{
      const url = DATA_URL + "?v=" + Date.now();
      const res = await fetch(url, {cache:"no-store"});
      if(!res.ok) throw new Error("Không tải được dữ liệu JSON (" + res.status + ")");
      const data = await res.json();

      if(!data || !Array.isArray(data.equipment) || !Array.isArray(data.events)){
        throw new Error("Dữ liệu JSON không đúng cấu trúc NEMS.");
      }

      window.NEMS_DATA = data;
      const loading = document.getElementById("loadingScreen");
      if(loading) loading.remove();
      return data;
    }catch(err){
      console.error(err);
      const loading = document.getElementById("loadingScreen");
      if(loading){
        loading.innerHTML = `<div style="max-width:650px;padding:24px;text-align:center;font-family:Segoe UI,Arial;color:#991b1b">
          <h2>Không tải được dữ liệu NEMS</h2>
          <p>${String(err.message || err)}</p>
          <p>Hãy kiểm tra GitHub Actions đã chuyển <b>equipment.xlsx</b> thành JSON thành công chưa.</p>
        </div>`;
      }
      throw err;
    }
  })();
})();