# Kiểm chứng kỹ thuật CP2 — 16/09/2026

**Phạm vi:** kiểm tra nội bộ bản mẫu Mock với dữ liệu tự tạo. Không phải người ngoài nhóm dùng thử, không phải kết quả mô hình AI, không xác nhận form BTC đã ghi nhận.

Entry point đã kiểm chứng là **`codebase/index.html`**. Các commit CP3 đồng đội thêm trong lúc thực hiện được giữ nguyên ở `codebase/mock/` và `eval/`; báo cáo này không xác nhận các tuyên bố AI/metrics của phần CP3 đó.

## Kết quả

- **7/7 kiểm tra logic đạt** bằng `node --test codebase/model.test.js`: bắt buộc mở nguồn, duyệt đủ, nhánh thiếu chắc chắn, chặn chốt khi lỗi/thiếu nguồn, correction, bỏ/khôi phục, danh sách rỗng, đầu vào không hợp lệ và xuất dữ liệu có ghi rõ mock.
- **8 nhóm kiểm tra trình duyệt đạt**, gồm CP2-01 đến CP2-07, tải JSON thật, nhánh phục hồi, xem/sửa/chốt trên mobile 390 px và thứ tự focus ban đầu bằng bàn phím. Không có lỗi JavaScript trang trong lượt chạy.
- Mở trực tiếp bằng **`file://`**, chứng minh không cần web server, mạng hoặc cài thư viện để sử dụng prototype.
- Trình duyệt kiểm tra: **Microsoft Edge headless 153.0.4234.32**, phiên tạm độc lập. Kết nối Browser trong ứng dụng không khả dụng sau hai lần thử; không dùng kết nối đó để tuyên bố đã kiểm chứng.
- Đã xem ảnh desktop và mobile: chữ, nguồn, thông báo thiếu ngữ cảnh và nút quyết định hiển thị; kiểm tra mobile không tràn ngang. Đây không phải kiểm toán accessibility đầy đủ hoặc kiểm tra trên mọi trình duyệt.

Báo cáo máy: [qa/report.json](qa/report.json). Ảnh: [desktop](qa/desktop-review.png), [mobile](qa/mobile-review.png), [không có căn cứ](qa/no-grounding.png).

## Cách chạy lại

Kiểm tra logic không cần thư viện ngoài:

```sh
node --test codebase/model.test.js
node --check codebase/app.js
node --check codebase/model.js
```

Kiểm tra trình duyệt là công cụ phát triển tùy chọn, không phải dependency của prototype. Cài Playwright ở thư mục riêng rồi truyền đường dẫn package và executable trình duyệt vào:

```sh
node codebase/browser.test.cjs /path/to/node_modules/playwright /path/to/browser-executable
```

Nếu bỏ executable, dùng Chromium do Playwright đã cài. Có thể đặt `CP2_QA_OUTPUT` để chọn thư mục lưu ảnh/báo cáo; mặc định `/tmp/discord-pulse-cp2-qa-results`. Script dùng profile mới, dữ liệu giả và trang cục bộ. Nó kiểm tra kết quả tải xuống, không đọc profile người dùng.

## Giới hạn cần giữ rõ khi demo

- Mức tin cậy, AI và lỗi dựng sẵn. Retry chuyển sang kịch bản thành công giả lập; chưa phải lời gọi mạng.
- Quyết định ở bộ nhớ tab; phải tải JSON trước khi đóng hoặc tải lại. Không lưu máy chủ và không đồng bộ Discord.
- Hai server/hai ngày dùng chung ví dụ tổng hợp; không phải bộ lọc trên pack thật.
- Chưa có phép đo ≤5 phút với TA, chưa có golden set CP3, chưa có validation CP5.
- **Còn thao tác hành chính:** đội trưởng gửi link mã nguồn qua form CP2 và giữ xác nhận trước 21:00 ngày 16/09. Không ghi “đã nộp” khi chưa có bằng chứng.
