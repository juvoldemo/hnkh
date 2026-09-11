# Hội Ngộ — Quản lý hội nghị khách hàng

Chạy `npm start`, sau đó mở http://localhost:3000. Cần Node.js 18 trở lên, không cần cài thư viện. Hoặc mở trực tiếp `index.html` trong trình duyệt hiện đại.

- Tạo và chuyển đổi nhiều hội nghị; chỉnh sửa tên, ngày, địa điểm.
- Thêm tùy ý các mức quà: ngưỡng phí, điều kiện từ (≥) hoặc trên (>), tên quà và giá trị.
- Chọn mức cao nhất đủ điều kiện, không cộng dồn. Thay đổi chính sách sẽ tính lại quà của mọi khách hàng trong hội nghị.
- Trang chính là giao diện trình chiếu, không có thanh bên hoặc khung nhập riêng. Nhập khách hàng, phí và TVV tại dòng cuối bảng; quà hiện ngay theo phí; nhấn Enter hoặc Thêm để lưu. Tổng tiền cập nhật khi lưu đăng ký.
- Nút bút chì đưa đăng ký về dòng nhập để sửa; nút × xóa đăng ký.
- Toàn bộ khách hàng hiển thị trong một danh sách cuộn, không phân trang. Tiêu đề hội nghị, tổng số liệu, tiêu đề cột và dòng nhập luôn cố định. Chữ lớn, in đậm để trình chiếu. Toàn màn hình vẫn nhập được trực tiếp; Esc thoát toàn màn hình.
- Xuất CSV UTF-8 mở bằng Excel; sao lưu và khôi phục toàn bộ hội nghị bằng JSON.

Dữ liệu minh họa gồm 8 khách hàng từ ảnh mẫu và 7 ngưỡng quà. Hãy tạo hội nghị mới để sử dụng dữ liệu thực. Ứng dụng hỗ trợ đăng nhập Supabase, tự lưu danh sách khách hàng và ảnh theo từng hội nghị, đồng thời giữ bản cục bộ khi mất mạng. Xem [hướng dẫn thiết lập Supabase](supabase/README.md) và chạy [SQL thiết lập](supabase/schema.sql) trước khi sử dụng. Nên tải bản sao lưu sau mỗi hội nghị. Font Google Fonts có font hệ thống dự phòng khi không có Internet.

Kiểm thử: chạy `npm install`, `npx playwright install chromium`, rồi `npm test`. Bộ kiểm thử trình duyệt xác minh nhập trực tiếp bằng Enter, ngưỡng quà, chỉnh sửa/xóa, tổng tiền, lưu sau tải lại, thay đổi chính sách, xuất CSV, khôi phục sao lưu, nhập khi toàn màn hình, chuyển trang và bố cục điện thoại.
