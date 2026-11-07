# Thiết lập Supabase tự động

Ứng dụng có hai mức đăng nhập, được kiểm tra tại máy chủ: **0000** cho người dùng thường và **1795** cho admin. Mọi người mở cùng địa chỉ website, đăng nhập và chọn cùng hội nghị để cùng nhập dữ liệu, kể cả ở các mạng khác nhau.

## Kích hoạt một lần

1. Mở SQL Editor trong Supabase Studio của dự án https://supabase.bvntkhanhhoa.asia.
2. Chạy toàn bộ [schema.sql](schema.sql). Có thể chạy lại trên bảng đã tồn tại. SQL cho phép owner_id trống để nhận diện hội nghị chung, cấp quyền đọc/ghi tương ứng và cập nhật hàm lưu cùng chính sách ảnh.
3. Build và mở lại trang, nhập mật khẩu `0000` hoặc `1795`. Nút Supabase hiển thị trạng thái và nút đồng bộ. Admin có thêm nút **Cập nhật** trên thanh công cụ.

Chạy lại toàn bộ SQL mới để tạo `hn_role` và cập nhật quy tắc đóng hội nghị. Chỉ có `hn_login` của phiên bản trước là chưa đủ. Khóa public anon không có quyền chạy SQL quản trị.

npm start và npm run build đọc NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY từ môi trường, .env hoặc .env.local; nếu không có thì dùng supabase-config.js. Không dùng khóa service_role trong trình duyệt.

## Dữ liệu và đồng bộ

- Mỗi bản ghi hn_conferences chứa một hội nghị và danh sách khách hàng. Hội nghị chung có owner_id = NULL. Bản ghi cũ thuộc tài khoản vẫn giữ nguyên quyền riêng của tài khoản, không tự chuyển thành dữ liệu chung.
- Dữ liệu cục bộ dùng khóa hoi-ngo-conferences-v1. Các bản cũ lưu theo khóa tài khoản vẫn còn trên thiết bị; dùng bản sao lưu JSON để khôi phục vào hội nghị chung nếu cần.
- Ảnh chung dùng bucket conference-images, thư mục shared/<conference-id>/<image-id>, tối đa 20 MB. Ảnh cũ trong thư mục tài khoản vẫn yêu cầu quyền của tài khoản; chọn lại ảnh khi chuyển sang hội nghị chung.
- Trang tự lưu thay đổi và lấy dữ liệu máy chủ mỗi 3 giây khi đang mở. Khi mất mạng, giữ dữ liệu cục bộ và thử lại khi kết nối phục hồi. Đồng bộ không xóa nội dung đang gõ trong ô nhập.
- Các đăng ký mới nhập đồng thời được gộp theo ID. Nếu hai người sửa cùng thông tin khác nhau, giữ bản cục bộ và báo xung đột. Sao lưu JSON trước khi chọn Tải bản trên máy chủ để xử lý thủ công.
- Người dùng thường đóng nhập sau khi hết ngày bắt đầu + 1 ngày, theo giờ Việt Nam. Ví dụ bắt đầu 07/11 thì đóng lúc 00:00 ngày 09/11; sau đó vẫn xem và xuất dữ liệu. Máy chủ chặn người dùng thường sửa hội nghị đã đóng, kể cả đổi ngày để mở lại.
- Admin vẫn được thêm và sửa phí sau khi đóng. Dữ liệu sau khi đóng là bản nháp cục bộ, không tự gửi dù tải lại trang hay có mạng. Bấm **Cập nhật** để gửi dữ liệu hội nghị đang chọn; nhập ở hội nghị còn mở vẫn tự đồng bộ như trước. Nút Đồng bộ lại không gửi bản nháp admin sau khi đóng.
- Dữ liệu mẫu không tải lên. Tạo hội nghị mới để nhập dữ liệu thật. Bản sao lưu JSON chứa tham chiếu ảnh, không chứa nội dung ảnh.

Quyền API và RLS được cấu hình cùng nhau theo [tài liệu Supabase](https://supabase.com/docs/guides/api/securing-your-api).

## Kiểm thử

`npm test` kiểm tra giao diện, đăng nhập, tải ảnh, đồng bộ nhiều thiết bị và giữ thay đổi khi xung đột bằng API giả lập. `tests/collaboration.test.js` kiểm tra mật khẩu sai/đúng, gộp đăng ký đồng thời, giữ bản đang gõ và mốc đóng nhập. Các bài kiểm tra không ghi dữ liệu thử lên máy chủ thật. `npm run build` tạo trang tĩnh trong `dist/`.
