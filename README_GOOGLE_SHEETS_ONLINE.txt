NEMS ONLINE - CÁCH KẾT NỐI GOOGLE SHEETS

1. Mở Google Sheet bạn đã tạo trước đó.
2. Vào Extensions > Apps Script.
3. Xóa nội dung Code.gs cũ, sao chép toàn bộ file google-apps-script/Code.gs trong gói này vào.
4. Chạy hàm setupNEMSOnline một lần và cấp quyền.
   Hệ thống tự tạo 3 sheet:
   - PM_Explanation
   - Forklift_Runtime
   - Compressor_Runtime
5. Deploy > Manage deployments > Edit > New version > Deploy.
   Có thể giữ nguyên URL Web App hiện tại.
6. File nems-online-config.js đã đặt URL:
   https://script.google.com/macros/s/AKfycbz7cz-uDA-56A7g2TI7RdJEBNjpz7L46lZHBARN6yN6SGRWLjJvqRdK1xe9sjwwfKwL/exec
7. Upload toàn bộ website lên GitHub và giữ nguyên equipment.xlsx.

PHÂN QUYỀN:
- Thomey — Head of Engineering Department — PIN 1369
- Nguyễn Văn Khang — Engineer — PIN 3617
- Nguyễn Hoàng Đức — Engineer — PIN 3836
- Phạm Thế Hòa — Experienced Technician — PIN 2243

LƯU Ý:
- Không thay đổi cấu trúc Equipment_Register hay Asset_Event_Log1.
- Giải trình và số giờ hoạt động được ghi vào các sheet Google riêng.
- Tab Lịch sử trên web vẫn hiển thị toàn bộ Asset_Event_Log1, kể cả dòng không có mã tài sản.
