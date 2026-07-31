NEMS – KẾ HOẠCH BẢO TRÌ & CHUYỂN ĐỔI CHIẾN LƯỢC (AUDIT ISO)

1. Tab Kế hoạch bảo trì có thêm bảng năm giống biểu mẫu NBH-KTP01F02.
2. Lịch sử PM trong Asset_Event_Log1 tự động điền vào ô Thực hiện / Actual theo tháng.
3. Ô kế hoạch đã qua tháng nhưng chưa có PM chuyển đỏ “CHƯA BT”. Tháng hiện tại chuyển vàng “ĐẾN HẠN”.
4. Chu kỳ được đọc trong 1 cột:
   - N/A: không tạo PM
   - 1 tháng, 2 months, 06 tháng: theo tháng
   - 100h, 500 giờ: theo giờ
   - Theo sản phẩm / 100000 sản phẩm: theo sản lượng
   - Bảo trì theo điều kiện / CBM / Condition-based: không tạo lịch tháng
5. Nút IN / LƯU PDF mở hộp thoại in trình duyệt, khổ A3 ngang. Chọn “Save as PDF”.

CHUYỂN TỪ THEO THÁNG SANG BẢO TRÌ THEO ĐIỀU KIỆN
- Không xóa hoặc sửa hồi tố kế hoạch và hồ sơ PM cũ.
- Nhấn “GHI NHẬN CHUYỂN ĐỔI” trước hoặc đồng thời với việc đổi cột Chu kỳ bảo dưỡng trong Excel.
- Ghi rõ ngày hiệu lực, lý do, đánh giá rủi ro, biện pháp kiểm soát và người phê duyệt.
- Sau ngày hiệu lực, sửa Chu kỳ bảo dưỡng thành “Bảo trì theo điều kiện”. NEMS không tạo lịch tháng mới nhưng lịch sử cũ vẫn còn.
- Các điều kiện kiểm soát nên được quy định trong SOP/checklist: trước/sau sử dụng, rung, nhiệt độ, rò rỉ, tiếng ồn, chất lượng đầu ra và giới hạn dừng máy.

CẬP NHẬT GOOGLE APPS SCRIPT
- Thay Code.gs hiện tại bằng file google-apps-script/Code.gs trong gói này.
- Chạy setupNEMSOnline() một lần để tạo sheet Maintenance_Strategy_Change.
- Deploy lại Web App với quyền như cấu hình hiện tại.
