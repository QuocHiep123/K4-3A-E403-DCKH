# Ghi chú thuyết trình — Discord Pulse

## 1. Discord Pulse

Một TA rà soát Discord cuối ngày, tìm hội thoại còn vướng và chốt tối đa 5 ca cần theo dõi. Mục tiêu là hoàn thành lượt rà soát trong 5 phút.

## 2. Nỗi đau

Có người trả lời chưa có nghĩa là vấn đề đã xong. Ví dụ M05023 hỏi lỗi setup, M13539 trả lời bằng câu hỏi chẩn đoán về email GitHub. TA cần thấy cả câu hỏi và phản hồi để quyết định bước tiếp theo.

## 3. Luồng giải pháp

Chọn dữ liệu có sẵn, CSV hoặc hội thoại dán. Lọc ngày/kênh, xem nguồn, chọn model rồi chạy AI. Mở tin gốc, sửa nhận định nếu cần và lưu tối đa 5 ca cần theo dõi. Quyết định được lưu trong trình duyệt và có thể xuất ra file.

## 4. Demo tính năng mới

- CSV của giám khảo có thể được tải ngay trên giao diện. Các cột bắt buộc là `msg_id` và `content`; file mẫu có thêm cột thời gian, kênh và `reply_to` để giữ ngữ cảnh.
- Chọn Gemini Flash, Nemotron hoặc nhập ID model OpenRouter khác. Model có sẵn được áp dụng ngay khi chọn, ID tự nhập áp dụng khi Enter hoặc rời ô nhập.
- Chạy phân tích. Mỗi lượt tối đa 6 hội thoại; model trả phí chạy tối đa 3 lượt song song.
- Dừng phân tích để tiếp tục thao tác trên giao diện. Kết quả đã nhận được giữ lại. Yêu cầu đã gửi tới provider có thể vẫn hoàn tất.
- Mở phần câu hỏi chung chưa trả lời. Kiểm tra từng hội thoại, loại thành viên không phù hợp và xác nhận các câu có thể dùng cùng câu trả lời.
- TA viết câu trả lời chung, sao chép hoặc tải bản nháp. Hệ thống không tự gửi lên Discord.

Để demo nhanh bằng dữ liệu dán, dùng các khối sau, ngăn bằng `---`:

```text
Học viên A: Cho em hỏi hạn nộp bài tập số 2 là lúc nào ạ?
---
Học viên B: Bài tập số 2 phải nộp trước mấy giờ ạ?
---
Học viên C: Tài khoản Phoenix của em báo không có quyền truy cập, nhờ TA kiểm tra giúp em.
```

Hai câu hỏi hạn nộp cùng bài là ứng viên cho một câu trả lời chung. Lỗi tài khoản cần xử lý riêng. Khi soạn câu trả lời, dùng hạn nộp đã được xác nhận từ tài liệu khóa học.

## 5. Phản hồi từ prototype

Slide giữ phần phản hồi và kết quả 5 phiên dùng thử trong nhật ký ngày 17/09 của bản trình bày gốc. Nêu hai thay đổi sản phẩm: thao tác trên một trang và phản hồi rõ ràng khi lưu/dừng.

## 6. Đội ngũ và hướng phát triển

Giới thiệu phân công của bốn thành viên. Hướng phát triển tiếp theo là kết nối Discord để nạp tin, hỗ trợ lịch rà soát cuối ngày và phối hợp giữa nhiều TA.

## Xuất PDF

```sh
node evidence/render-slides.cjs /path/to/playwright /path/to/browser /tmp/discord-pulse-slide-qa
```

Nguồn slide: `evidence/slide_cp5.html`. PDF: `demo-slides.pdf`.
