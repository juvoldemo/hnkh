# Hội Ngộ — Quản lý hội nghị khách hàng

Ch?y `npm start`, sau ?? m? http://localhost:3000. C?n Node.js 18 tr? l?n. Danh s?ch TVV trong `advisors-data.js` ???c nh?p t? file Excel v? t?i c?ng trang, d?ng ???c c? tr?n Live Server v? Vercel.

- Tạo và chuyển đổi nhiều hội nghị; chỉnh sửa tên, ngày, địa điểm.
- Thêm tùy ý các mức quà: ngưỡng phí, điều kiện từ (≥) hoặc trên (>), tên quà và giá trị.
- Chọn mức cao nhất đủ điều kiện, không cộng dồn. Thay đổi chính sách sẽ tính lại quà của mọi khách hàng trong hội nghị.
- Trang chính là giao diện trình chiếu, không có thanh bên hoặc khung nhập riêng. Nhập khách hàng, phí và TVV tại dòng cuối bảng; quà hiện ngay theo phí; nhấn Enter hoặc Thêm để lưu. Tổng tiền cập nhật khi lưu đăng ký.
- Nút bút chì đưa đăng ký về dòng nhập để sửa; nút × xóa đăng ký.
- Toàn bộ khách hàng hiển thị trong một danh sách cuộn, không phân trang. Tiêu đề hội nghị, tổng số liệu, tiêu đề cột và dòng nhập luôn cố định. Chữ lớn, in đậm để trình chiếu. Toàn màn hình vẫn nhập được trực tiếp; Esc thoát toàn màn hình.
- Xuất CSV UTF-8 mở bằng Excel; sao lưu và khôi phục toàn bộ hội nghị bằng JSON.

Dữ liệu minh họa gồm 8 khách hàng từ ảnh mẫu và 7 ngưỡng quà. Hãy tạo hội nghị mới để sử dụng dữ liệu thực. Ứng dụng tự kết nối Supabase không cần đăng nhập, tự lưu danh sách khách hàng và ảnh theo từng hội nghị chung, đồng thời giữ bản cục bộ khi mất mạng. Xem [hướng dẫn thiết lập Supabase](supabase/README.md) và chạy [SQL thiết lập](supabase/schema.sql) trước khi sử dụng. Nên tải bản sao lưu sau mỗi hội nghị. Font Google Fonts có font hệ thống dự phòng khi không có Internet.

Kiểm thử: chạy `npm install`, `npx playwright install chromium`, rồi `npm test`. Bộ kiểm thử trình duyệt xác minh nhập trực tiếp bằng Enter, ngưỡng quà, chỉnh sửa/xóa, tổng tiền, lưu sau tải lại, thay đổi chính sách, xuất CSV, khôi phục sao lưu, nhập khi toàn màn hình, chuyển trang và bố cục điện thoại.

## Triển khai trên Vercel

Trong Project → Settings → Environment Variables, cấu hình cho Production:

- `NEXT_PUBLIC_SUPABASE_URL`: URL Supabase của dự án.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: khóa public `anon`.
- `SUPABASE_SERVICE_ROLE_KEY`: khóa `service_role` của cùng dự án Supabase, chỉ được dùng trong API máy chủ.

Sau khi lưu biến môi trường, triển khai lại bản mã mới. `/api/advisors` phải trả về danh sách TVV đang hoạt động với ba trường `name`, `code`, `group`. Không đặt khóa `service_role` trong biến có tiền tố `NEXT_PUBLIC_`. Thiếu khóa máy chủ sẽ trả HTTP 503 thay vì báo thành công với danh sách rỗng.## Danh s?ch TVV

Ngu?n: `APM01 Agent Detail Information (2).xlsx`, trang t?nh ??u ti?n, A2:C311. 310 TVV c? ?? t?n, m? v? nh?m. G?i ? d?ng d? li?u trong `advisors-data.js`; Supabase ch? d?ng ?? l?u v? ??ng b? ??ng k?. Kh?ng c?n kh?a m?y ch? ?? t?i danh s?ch TVV.
