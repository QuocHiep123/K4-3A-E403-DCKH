# Discord Pulse — bản mẫu CP2

**Dashboard mới ở trang chủ:** xem [cách chạy và giới hạn hiện tại](dashboard.md). Chạy `python server.py` từ gốc repo rồi mở http://localhost:8080. Tài liệu bên dưới chỉ mô tả bản CP2.

**Mức: Mock.** HTML/CSS/JS thuần, không cần cài thư viện, API key hay mô hình AI. Toàn bộ tin nhắn và đề xuất là ví dụ tự tạo; không sao chép data pack. Phạm vi một TA rà soát một server/ngày, chốt tối đa 5 hội thoại cần theo dõi.

**Link mã nguồn để nộp CP2:** https://github.com/QuocHiep123/K4-3A-E403-DCKH/tree/main/codebase

**Đúng phiên bản CP2:** mở `codebase/index.html`. Thư mục `codebase/mock/` là phần CP3 đồng đội phát triển riêng; báo cáo kiểm chứng bên dưới chỉ áp dụng cho bản CP2 ở thư mục này.

GitHub hiển thị mã nguồn, không chạy trang HTML. Tải/clone repo rồi mở `codebase/index.html` bằng trình duyệt, hoặc chạy từ gốc repo:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory codebase
```

Mở http://127.0.0.1:4173. Không cần build hoặc kết nối mạng khi dùng bản mẫu. [Spec §4 và §6](../spec.md) giải thích luồng và nguyên tắc HAX; [sơ đồ luồng](flow.md) có thể xem ngay trên GitHub.

## Kiểm chứng bốn đường đi

| Case | Thao tác | Kết quả mong đợi |
|---|---|---|
| CP2-01 Happy path | Chọn **01 · Đủ căn cứ** → Tạo lượt rà soát → với từng hội thoại, Mở tin nguồn → Lưu quyết định → Chốt danh sách | Duyệt 3/3, hai hội thoại cần theo dõi, một đã giải quyết; tải JSON ghi rõ mock |
| CP2-02 Low-confidence | Chọn **02 · Chưa chắc chắn** → mở nguồn → thử lưu không có lý do → điền “Hỏi thêm lỗi ở bước nào và xin mô tả ảnh” → lưu → chốt | Nhãn chưa chắc chắn và giới hạn hiện rõ; không cho lưu thiếu lý do; kết quả giữ “Cần kiểm tra thêm” |
| CP2-03 No-grounding | Chọn **03 · Không có căn cứ** → Kiểm tra dữ liệu đầu vào → Thử lượt có căn cứ | Mã không tồn tại bị loại; không có nút chốt hay kết quả bịa; khôi phục sang luồng happy giả lập, giữ server/ngày |
| CP2-04 Correction | Chọn **04 · Sửa nhận định sai** → mở hai tin nguồn → đổi quyết định thành Đã giải quyết → ghi lý do dựa trên DEMO-M06 → lưu → chốt | Hội thoại ra khỏi danh sách theo dõi; kết quả rỗng hợp lệ; JSON giữ đề xuất AI cũ, quyết định TA và lý do |
| CP2-05 Request failure | Chọn **05 · Lỗi gọi AI** → xem dữ liệu đầu vào → Thử lại | Báo lỗi giả lập, không tạo đề xuất; thử lại chuyển rõ ràng sang phản hồi thành công dựng sẵn |
| CP2-06 Empty | Chọn **06 · Không có hội thoại** → Chốt danh sách rỗng | Danh sách 0 mục có giới hạn “không chứng minh toàn server không còn ai cần giúp” |
| CP2-07 Reopen / dismiss | Sau khi lưu, Mở lại để duyệt; hoặc chọn Bỏ khỏi đề xuất kèm lý do; sau khi chốt, Quay lại chỉnh sửa | Có thể sửa/bỏ/khôi phục mà không gọi lại AI; cần chốt lại sau thay đổi |

Trong mỗi lượt, chưa mở nguồn thì chưa được quyết định; chưa duyệt hết thì chưa được chốt. Chỉ **Cần theo dõi** và **Cần kiểm tra thêm** vào danh sách cuối. Không tự gửi tin, DM hay cập nhật Discord. “Tạo lượt rà soát” thay thế lượt hiện tại, đóng/tải lại tab sẽ mất quyết định chưa xuất; giao diện báo rõ điều này.

## Phần thật và giả lập

| Thành phần | CP2 |
|---|---|
| Chọn phạm vi, mở nguồn, sửa/bỏ/duyệt, yêu cầu lý do, khóa nút, đếm quyết định | Chạy thật trong trình duyệt |
| Danh sách cuối, mở lại chỉnh sửa, lịch sử quyết định, tải JSON | Chạy thật; chỉ lưu trong bộ nhớ tab và tệp tải xuống |
| Nội dung hội thoại, đề xuất AI, mức tin cậy, lỗi và phục hồi | Giả lập xác định trước; không phải đánh giá mô hình |
| Hai server / hai ngày chọn được | Đổi nhãn phạm vi; dùng chung bộ ví dụ tự tạo, không truy vấn dữ liệu thật |
| AI/API, Discord, xác thực, lưu máy chủ, dữ liệu pack | Chưa triển khai; lời gọi AI thật để CP3 |

## Kiểm tra kỹ thuật

```sh
node --test codebase/model.test.js
node --check codebase/app.js
```

Đây là kiểm tra logic tương tác, **không phải golden set CP3, không đo độ chính xác AI và không thay thế dùng thử CP5**. Kết quả kiểm chứng: [verification.md](verification.md).

## Nộp mốc

Đội trưởng nộp link mã nguồn ở trên qua form CP2 của BTC trước **21:00 ngày 16/09/2026 (giờ Việt Nam)**. Chưa có URL form trong repo; mục form của README gốc vẫn là “cập nhật lúc khai mạc”. Chưa có bằng chứng form đã được gửi/ghi nhận. Commit/push không tự động nộp form.
