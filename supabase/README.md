# Thiết lập Supabase tự động

Ứng dụng tự kết nối bằng public anon key khi mở trang, không cần email, mật khẩu hoặc phiên đăng nhập. Các thiết bị dùng chung hội nghị. Người mở trang/API có thể đọc và sửa dữ liệu hội nghị chung.

## Kích hoạt một lần

1. Mở SQL Editor trong Supabase Studio của dự án https://supabase.bvntkhanhhoa.asia.
2. Chạy toàn bộ [schema.sql](schema.sql). Có thể chạy lại trên bảng đã tồn tại. SQL cho phép owner_id trống để nhận diện hội nghị chung, cấp quyền đọc/ghi tương ứng và cập nhật hàm lưu cùng chính sách ảnh.
3. Build và mở lại trang. Nút Supabase hiển thị trạng thái và nút đồng bộ, không có biểu mẫu đăng nhập.

Kiểm tra máy chủ ngày 13/09/2026: bảng đã tồn tại, nhưng hàm lưu hiện trả Authentication required với public key. Cần áp dụng SQL cập nhật trước khi có thể lưu không đăng nhập. Khóa công khai không có quyền chạy SQL quản trị.

npm start và npm run build đọc NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY từ môi trường, .env hoặc .env.local; nếu không có thì dùng supabase-config.js. Không dùng khóa service_role trong trình duyệt.

## Dữ liệu và đồng bộ

- Mỗi bản ghi hn_conferences chứa một hội nghị và danh sách khách hàng. Hội nghị chung có owner_id = NULL. Bản ghi cũ thuộc tài khoản vẫn giữ nguyên quyền riêng của tài khoản, không tự chuyển thành dữ liệu chung.
- Dữ liệu cục bộ dùng khóa hoi-ngo-conferences-v1. Các bản cũ lưu theo khóa tài khoản vẫn còn trên thiết bị; dùng bản sao lưu JSON để khôi phục vào hội nghị chung nếu cần.
- Ảnh chung dùng bucket conference-images, thư mục shared/<conference-id>/<image-id>, tối đa 20 MB. Ảnh cũ trong thư mục tài khoản vẫn yêu cầu quyền của tài khoản; chọn lại ảnh khi chuyển sang hội nghị chung.
- Trang tải hội nghị khi mở và tự lưu thay đổi. Khi mất mạng hoặc chưa cấu hình quyền, thay đổi vẫn lưu cục bộ và thử lại sau 15 giây hoặc khi có mạng. Không có cập nhật realtime; tải lại trang để lấy thay đổi từ thiết bị khác.
- Nếu hai thiết bị sửa cùng hội nghị, kiểm tra phiên bản ngăn ghi đè. Sao lưu JSON trước khi chọn Tải bản trên máy chủ, sau đó nhập lại thay đổi hoặc khôi phục thành hội nghị riêng.
- Dữ liệu mẫu không tải lên. Tạo hội nghị mới để nhập dữ liệu thật. Bản sao lưu JSON chứa tham chiếu ảnh, không chứa nội dung ảnh.

Quyền API và RLS được cấu hình cùng nhau theo [tài liệu Supabase](https://supabase.com/docs/guides/api/securing-your-api).

## Kiểm thử

npm test kiểm tra giao diện, tự đồng bộ không có phiên đăng nhập, tải ảnh, đọc lại dữ liệu và giữ thay đổi khi xung đột bằng API giả lập. Các bài kiểm tra giao diện khác chặn API Supabase để không ghi dữ liệu thử lên máy chủ thật. npm run build tạo trang tĩnh trong dist/.