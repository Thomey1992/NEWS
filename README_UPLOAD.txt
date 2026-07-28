NEMS - BẢN SỬA HOÀN CHỈNH

Cách cập nhật duy nhất:
1. Giải nén file ZIP.
2. Upload toàn bộ file và thư mục trong gói này vào thư mục gốc repository NEWS.
3. Chọn ghi đè các file trùng tên.
4. KHÔNG xóa và KHÔNG upload lại equipment.xlsx đang có trên GitHub.
5. Commit với nội dung: Fix NEMS QR and data update.

Sau khi commit:
- Workflow tự chạy vì convert_excel.py và workflow đã thay đổi.
- JSON được tạo lại từ equipment.xlsx hiện có.
- Thời gian generated dùng đúng múi giờ Việt Nam UTC+7.
- Workflow có chống chạy trùng và chống lỗi push xung đột.
- Web ưu tiên đọc JSON mới từ nhánh main và có nguồn dự phòng từ GitHub Pages.
- QR camera và thời gian cập nhật dữ liệu đã được tích hợp.

Không cần tự sửa code hoặc kiểm tra từng dòng.
