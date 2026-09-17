# Nhật ký Dùng thử Người dùng Ngoài Nhóm (R6) — Discord Pulse

**Mốc đánh giá:** CP5 (13:00 18/09/2026) · **Phiên bản thử nghiệm:** Prototype CP3 Live AI Dashboard (`index.html`)  
**Người điều phối:** Đặng Quốc Hiệp (Đội trưởng) · **Quan sát & ghi chép:** Đào Quang Cảnh, Nguyễn Thế Khang  
**Tiêu chuẩn Rubric R6:** Đủ 5 người ngoài nhóm (gồm 2 người đã khai từ CP1), có quote nguyên văn, có bảng nhật ký, có ít nhất 1 thay đổi được cập nhật vào `spec.md §9 Changelog`.

---

## 1. Danh sách 5 Người Dùng Ngoài Nhóm

| STT | Họ và tên | Vai trò / Bối cảnh | Nguồn người dùng | Thiết bị & Môi trường thử nghiệm |
|:---:|---|---|---|---|
| **1** | **Đỗ Đức Đại** | Học viên AI20k / Đóng vai TA rà soát cuối ngày | Đã khai từ CP1 (16/09) | Laptop Windows 11, Chrome 128 |
| **2** | **Phạm Cường Quốc** | Học viên AI20k / Đóng vai TA kiểm chứng kết quả | Đã khai từ CP1 (16/09) | Macbook Air M2, Safari |
| **3** | **Nguyễn Khánh Sơn** | Học viên AI20k / Đóng vai TA rà soát ca khó | Mời thêm ngày 17/09 | Laptop Dell XPS, Edge |
| **4** | **Ngô Xuân Hoàng** | Học viên AI20k / Đóng vai TA kiểm tra trích dẫn nguồn | Mời thêm ngày 17/09 | Desktop PC, Chrome 128 |
| **5** | **Đỗ Ngọc Phi** | Học viên AI20k / Đóng vai học viên kiểm tra độ tin cậy | Mời thêm ngày 17/09 | Laptop Asus Zenbook, Brave |

---

## 2. Phương pháp & Quy trình Thử nghiệm (Think-Aloud Protocol)

- **Nguyên tắc điều phối:** Giao task cụ thể cho người dùng tự làm trên màn hình, người điều phối **ngồi quan sát và giữ im lặng**, không mớm lời hay hỏi câu khen xã giao ("thấy app này hay không?").
- **Tác vụ giao cho người dùng (Task):**
  1. *Task 1:* Mở ứng dụng, chọn một hội thoại học viên đang gặp sự cố (ví dụ ca lỗi lab Phoenix M53930).
  2. *Task 2:* Bấm chạy phân loại AI, đọc phân tích và đối chiếu với tin nhắn gốc.
  3. *Task 3:* Thực hiện hành động của Trợ giảng (Xác nhận trạng thái hoặc Điều chỉnh nhận định sai).
  4. *Task 4:* Kiểm tra báo cáo kiểm thử tự động Golden Set trên màn hình.

---

## 3. Bảng Nhật Ký Quan Sát Chi Tiết 5 Phiên Thử Nghiệm

| Người thử | Nhiệm vụ (Task) | Điểm nghẽn / Lúng túng (Bottleneck) | Trích dẫn nguyên văn (Verbatim Quote) | Quyết định kỹ thuật của nhóm |
|---|---|---|---|---|
| **Đỗ Đức Đại** *(khai từ CP1)* | Rà soát nhanh ca `M53930` và chốt danh sách cần can thiệp | Ban đầu mở `codebase/mock/index.html` cũ bị kẹt vì phải bấm qua 2 trang chọn ngày và xem chủ đề mới tới được danh sách, mất hơn 1.5 phút. | *"Ủa sao ban đầu phải bấm qua 2 trang chọn ngày với xem chủ đề mới tới được danh sách? Nếu đang vội cuối ngày thì mình muốn mở ra thấy ngay top 5 cái kẹt nhất luôn."* | **Đã sửa ngay:** Gom toàn bộ quy trình 4 bước thành **All-in-One Dashboard** ngay tại trang chủ `index.html`. Giảm thời gian thao tác từ 4m15s xuống còn **1m20s**. |
| **Phạm Cường Quốc** *(khai từ CP1)* | Thử thách kịch bản AI phân loại sai và thực hiện sửa nhận định (Correction) | Khi bấm nút *"Xác nhận trạng thái"*, hệ thống không có thông báo gì khiến bạn ấy bấm liên tục 3 lần vì tưởng bị đơ web. | *"Nút 'Chạy AI' có hiện log terminal này hay đấy, nhìn biết ngay là máy đang gọi API chứ không phải dữ liệu tĩnh. Nhưng nút 'Xác nhận trạng thái' bấm xong chẳng biết đã lưu chưa, tưởng bị đơ."* | **Đã sửa ngay:** Bổ sung hộp thoại **Toast Notification màu xanh** nổi bật góc dưới màn hình (`✓ Đã lưu quyết định của TA vào hệ thống!`) và in dòng log xác nhận trực tiếp vào terminal console. |
| **Nguyễn Khánh Sơn** *(Học viên AI20k)* | Đọc hiểu các mức độ tin cậy và lý do trích dẫn căn cứ | Lúng túng với màu sắc: Case `M36026` thiếu ngữ cảnh nhưng ban đầu cùng màu với case đã có phản hồi khiến khó phân biệt mức độ khẩn cấp. | *"Chỗ độ tin cậy 92% có màu xanh dễ nhìn, nhưng với case thiếu ngữ cảnh như M36026 thì nên hiện chữ màu vàng cảnh báo rõ hơn để TA biết ca này phải vào hỏi lại học viên."* | **Đã sửa ngay:** Tách màu riêng cho từng nhãn: `🔴 Cần theo dõi` (Đỏ/Cam), `🟡 Chưa rõ kết quả` (Vàng), `🟢 Đã giải quyết` (Xanh lục), `⚪ Thiếu ngữ cảnh` (Xám tro). |
| **Ngô Xuân Hoàng** *(Học viên AI20k)* | Kiểm tra tính xác thực của lời gọi AI và căn cứ trích dẫn | Ban đầu đọc đoạn tin nhắn Discord thấy cả tin SV và TA gộp chung một khối nên mất vài giây để tìm ai là người nhắn sau cùng. | *"Phần trích dẫn tin nhắn Discord nên hiện rõ ai là sinh viên ai là TA trả lời, chứ nhìn một cục text dễ bị nhầm. Có thêm 2 cửa sổ terminal chạy lệnh python bên cạnh nhìn rất chuyên nghiệp và minh bạch."* | **Đã sửa ngay:** Tách rõ 2 khối tin nhắn riêng biệt: Khối tin nhắn học viên có border xanh tím, khối tin nhắn reply của TA có icon chat và nền phân cách rõ ràng. |
| **Đỗ Ngọc Phi** *(Học viên AI20k)* | Đóng vai học viên kiểm tra xem câu hỏi ngắn có bị AI đoán mò không | Quan sát thấy khi bấm nút gọi AI, nếu mạng hơi chậm thì không biết máy có đang xử lý hay bị treo. | *"Bấm nút 'Chạy AI' thì nó delay tầm 1 giây, nếu không để ý terminal thì sợ web lag. Nên disable nút và đổi text thành 'Đang gọi OpenRouter...' để người dùng biết là đang chờ mạng."* | **Đã sửa ngay:** Thêm hiệu ứng disable nút khi click, đổi trạng thái badge thành *"Đang gọi OpenRouter..."* và hiệu ứng pulsing viền tím cho result card. |

---

## 4. Bốn Dòng Kết Luận Bắt Buộc (Rubric R6)

1. **Chủ đề lặp lại nhiều nhất:**  
   Người dùng muốn **tối giản số bước click** (thay vì bấm 4 trang liên tiếp, họ muốn một màn hình nhìn thấy ngay cả Input, AI call và Output) và yêu cầu **phản hồi thị giác tức thì** (visual feedback) khi hệ thống đang xử lý hoặc khi lưu quyết định của TA.

2. **Sẽ sửa gì trước buổi demo (CP6):**  
   - Đã gộp toàn bộ vào màn hình All-in-One Dashboard (`index.html`) kèm 2 cửa sổ terminal trực quan.  
   - Đã bổ sung Toast Notification xanh khi TA chốt quyết định.  
   - Đã phân tách màu sắc badge trạng thái và phân tách rõ khối tin nhắn học viên vs reply của TA.

3. **Giữ nguyên gì và vì sao:**  
   - **Giữ nguyên nguyên tắc cốt lõi HAX G11:** AI chỉ đề xuất phân loại và độ tin cậy; quyền chốt danh sách hoặc sửa nhận định luôn thuộc về Trợ giảng.  
   - **Giữ nguyên Non-goal 1:** Không tự động gửi tin nhắn hoặc đóng thread trên Discord thật để tránh rủi ro AI can thiệp sai lệch.

4. **Gì để dành sau Hackathon:**  
   - Tính năng tự động quét định kỳ theo lịch trình (cron job) lúc 23:00 hàng ngày.  
   - Cơ chế đồng bộ nhiều TA cùng trực ca qua WebSocket và tích hợp đăng nhập Discord OAuth thật.

---

## 5. Đo Lường Kết Quả So Với Tiêu Chí Ban Đầu

| Chỉ số nghiệm thu | Mục tiêu đề ra | Kết quả thực tế qua 5 phiên thử nghiệm | Đánh giá |
|---|:---:|:---:|:---:|
| **Thời gian hoàn thành tác vụ** | $\le 5$ phút | **1 phút 25 giây** (trung bình qua 5 người) | **ĐẠT XUẤT SẮC** |
| **Hiểu đúng nhãn trạng thái AI** | $\ge 4/5$ người | **5/5 người (100%)** hiểu đúng sau khi cải tiến màu sắc | **ĐẠT** |
| **Tự điều chỉnh nhận định sai không cần hướng dẫn** | $\ge 4/5$ người | **5/5 người (100%)** bấm nút sửa và lưu thành công | **ĐẠT** |
| **Đánh giá giải pháp có thể ứng dụng thực tế** | $\ge 3/5$ người | **4/5 người (80%)** đồng ý muốn dùng nếu có bản triển khai thật | **ĐẠT** |
