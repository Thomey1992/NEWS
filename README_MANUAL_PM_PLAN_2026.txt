NEMS - THIẾT LẬP KẾ HOẠCH BẢO TRÌ THỦ CÔNG TỪ 2026

1. Từ năm 2026 trở đi, các thiết bị có Chu kỳ bảo dưỡng thuộc nhóm "Theo tháng" sẽ không tự suy đoán tháng KH.
2. Head of Engineering Department chọn trực tiếp từng ô KH trong bảng kế hoạch.
3. Nhấp ô KH trống -> đăng nhập PIN -> CHỌN BẢO TRÌ THÁNG NÀY.
4. Nhấp ô KH có X -> đăng nhập PIN -> BỎ KẾ HOẠCH THÁNG NÀY.
5. Actual/TH vẫn lấy nguyên từ Asset_Event_Log1, không bị thay đổi.
6. Tháng lắp đặt không cho lập PM. Trước 10/2023 không ghi nhận kế hoạch.
7. Năm 2023-2025 vẫn giữ logic lịch cũ để bảo toàn hồ sơ lịch sử.
8. Danh sách năm trên web: 2023 đến tối thiểu 2035.
9. Dữ liệu KH thủ công lưu tại Google Sheet: Maintenance_Plan_Setting.
10. Phân quyền: chỉ PIN 1369 (Thomey - Head of Engineering Department) được chỉnh KH; các tài khoản còn lại chỉ xem.

CẬP NHẬT GOOGLE APPS SCRIPT
- Mở Apps Script hiện tại.
- Thay Code.gs bằng file google-apps-script/Code.gs trong bộ này.
- Chạy setupNEMSOnline() một lần để tạo sheet Maintenance_Plan_Setting.
- Deploy > Manage deployments > Edit > New version > Deploy.
- Giữ nguyên URL /exec nếu đang dùng deployment hiện tại.
