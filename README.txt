NEMS JSON FAST - phiên bản tối ưu tốc độ

MỤC TIÊU
- Website KHÔNG tải và phân tích file equipment.xlsx trên điện thoại/máy tính nữa.
- GitHub Actions tự chuyển equipment.xlsx thành web-data/nems-data.json.
- Website đọc JSON trực tiếp từ branch main, nhẹ và nhanh hơn.
- QR/link từng máy không đổi.

CẬP NHẬT HẰNG NGÀY
1. Excel Online -> Download.
2. Đổi tên file thành equipment.xlsx.
3. GitHub repo NEWS -> Add file -> Upload files.
4. Chỉ upload equipment.xlsx -> Commit changes.
5. GitHub Actions tự chuyển sang JSON.
6. Khi action "Update NEMS JSON data" có dấu xanh, F5 website là có dữ liệu mới.
   Website lấy JSON trực tiếp từ main nên không cần chờ GitHub Pages deploy lại toàn bộ web.

CÀI ĐẶT MỘT LẦN
Upload toàn bộ nội dung của ZIP này vào repo NEWS, bao gồm:
- index.html
- app.js
- style.css
- json-loader.js
- nanoco-logo.png
- equipment.xlsx
- web-data/nems-data.json
- scripts/convert_excel.py
- .github/workflows/update-nems-data.yml

LƯU Ý
- Giữ nguyên sheet Equipment_Register và Asset_Event_Log1.
- Ngày lịch sử vẫn lấy từ cột "Ngày nhận thông tin".
