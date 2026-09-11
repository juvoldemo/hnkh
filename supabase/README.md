# Thiết lập Supabase

Ứng dụng đã cấu hình URL và public anon key được cung cấp trong `supabase-config.js`. Đây là ứng dụng JavaScript tĩnh, không phải Next.js. `npm start` và `npm run build` hỗ trợ hai biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ môi trường, `.env` hoặc `.env.local`; trên Vercel hãy cấu hình cả hai rồi build lại. Không đưa khóa `service_role` vào ứng dụng.

## Kích hoạt một lần

1. Mở Supabase Studio của máy chủ `https://supabase.bvntkhanhhoa.asia`, vào SQL Editor và chạy toàn bộ `supabase/schema.sql`. Tệp tạo bảng, hàm lưu có kiểm tra phiên bản, bucket ảnh riêng tư và chính sách truy cập.
2. Trong Authentication → Users, tạo tài khoản email/mật khẩu và xác nhận email cho người sử dụng.
3. Chạy ứng dụng, bấm **Supabase** ở cuối màn hình rồi đăng nhập. Dùng cùng tài khoản trên thiết bị khác để mở các hội nghị của tài khoản đó.

Khóa anon chỉ dùng để gọi API công khai; không có quyền chạy SQL hay tạo người dùng quản trị. Kiểm tra ngày 11/09/2026: Auth trả HTTP 200; bảng `hn_conferences` chưa có trong schema cache (HTTP 404 / PGRST205). Chưa kiểm thử ghi dữ liệu thật vì chưa có schema và tài khoản đăng nhập.

## Dữ liệu và đồng bộ

- Mỗi bản ghi `hn_conferences` là một hội nghị. `payload` chứa tên, ngày, địa điểm, chính sách quà và toàn bộ khách hàng: ID, tên, phí đầu tư, tư vấn viên, thời điểm tạo, trạng thái đã nhận quà. Quà và giá trị quà được tính từ chính sách của hội nghị.
- Ảnh Background và hình Quà lưu trong bucket riêng tư `conference-images`, theo đường dẫn `<user-id>/<conference-id>/<image-id>`. Hỗ trợ JPEG, PNG, WebP, GIF tối đa 20 MB/ảnh. Ảnh đã chọn vẫn được giữ trong IndexedDB trước khi tải lên.
- Các hội nghị cục bộ không phải dữ liệu mẫu được chuyển vào vùng lưu của tài khoản khi đăng nhập lần đầu trên thiết bị. Hội nghị mẫu không tự tải lên; tạo hội nghị mới để nhập dữ liệu thật.
- Thay đổi tự lưu lên Supabase sau khi lưu cục bộ. Khi lỗi mạng, ứng dụng giữ thay đổi và thử lại sau 15 giây hoặc khi có mạng. Xem dòng trạng thái cuối màn hình để phân biệt lưu cục bộ và đã lưu Supabase.
- Đăng nhập hoặc tải lại trang sẽ lấy dữ liệu máy chủ. Không có cập nhật realtime. Nếu thiết bị khác đã sửa cùng hội nghị, ứng dụng từ chối ghi đè, giữ bản cục bộ và báo lỗi ở cửa sổ Supabase. Tải bản sao lưu JSON, sau đó chọn **Tải bản trên máy chủ** và nhập lại thay đổi cần giữ, hoặc khôi phục JSON thành hội nghị riêng.
- Phiên đăng nhập nằm trong sessionStorage của tab. Bộ nhớ dữ liệu cục bộ tách theo tài khoản. Đăng xuất không xóa bản lưu của tài khoản trên thiết bị.
- Bản sao lưu JSON chứa dữ liệu hội nghị và tham chiếu ảnh, không chứa dữ liệu ảnh. Ảnh Supabase cần đăng nhập tài khoản sở hữu; ảnh chưa đồng bộ chỉ có trên thiết bị gốc. Ảnh cũ được giữ khi thay ảnh, chưa có tác vụ dọn dẹp tự động.

RLS chỉ cho tài khoản sở hữu truy cập dữ liệu và ảnh, theo [hướng dẫn Supabase Storage](https://supabase.com/docs/guides/storage/security/access-control). Không cấp quyền đọc/ghi danh sách khách hàng cho `anon`.

## Kiểm thử

`npm test` chạy kiểm thử giao diện hiện có và kiểm thử Supabase với API giả lập: tải ảnh, lưu khách hàng, tải lại từ máy chủ và bảo toàn thay đổi khi xung đột. `npm run build` tạo trang tĩnh trong `dist/`.
