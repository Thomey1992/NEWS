NEMS - TỰ ĐỘNG CHUYỂN EQUIPMENT.XLSX -> JSON
================================================

CÁCH HOẠT ĐỘNG
1. Bạn chỉ cập nhật file equipment.xlsx.
2. Upload/ghi đè equipment.xlsx lên thư mục gốc repository NEWS và Commit.
3. GitHub Actions tự chạy workflow: Update NEMS JSON data.
4. Workflow chạy scripts/convert_excel.py.
5. File web-data/nems-data.json được tạo/cập nhật và commit tự động.
6. Website NEMS chỉ đọc JSON nên tải nhanh, không parse Excel trên trình duyệt.

KHÔNG CẦN
- Tự chuyển Excel sang JSON.
- Tự upload nems-data.json.
- Power Automate cho luồng dữ liệu này.
- Tải thư viện XLSX khi mở NEMS.

KIỂM TRA SAU KHI UPLOAD EXCEL
GitHub -> Actions -> Update NEMS JSON data
Chờ dấu tick xanh. Sau đó mở NEMS / F5.
NEMS sẽ hiển thị: Nguồn: JSON tự động từ Excel.

NẾU ACTION KHÔNG CHẠY
Repository -> Settings -> Actions -> General
Bảo đảm Actions được phép chạy và Workflow permissions có quyền Read and write permissions.

LƯU Ý
- Equipment_Register và Asset_Event_Log1 phải giữ đúng tên sheet.
- Workflow chỉ kích hoạt khi equipment.xlsx hoặc script/workflow liên quan thay đổi.
- JSON là file chạy web; Excel vẫn là nguồn dữ liệu gốc để quản lý.
