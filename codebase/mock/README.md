# Mock CP2 — Discord Pulse

Mock tĩnh bấm được (HTML/CSS/JS thuần, không cần build) thể hiện luồng 4 bước ở `spec.md §4`:

```
index.html (chọn ngày/server)
  → overview.html (tổng quan chủ đề)
    → priority-list.html (danh sách tối đa 5 hội thoại ưu tiên)
      → detail.html?id=... (nguồn + trạng thái + TA xác nhận/sửa)
```

**Cách xem:** mở `index.html` trực tiếp bằng trình duyệt (double-click hoặc kéo vào tab), bấm qua các bước như người dùng thật.

**Chưa có ở bản này (đúng phạm vi CP2):**
- Không có lời gọi AI thật — nội dung/trạng thái là dữ liệu mẫu gán cứng trong `detail.html`.
- Không đọc trực tiếp từ `data/discord-pack/`.
- Nút "Xác nhận trạng thái" chỉ hiện thông báo, chưa ghi vào đâu cả.

5 hội thoại minh hoạ trong `priority-list.html` dùng lại đúng các trích dẫn ngắn (≤2 câu, đã ẩn danh) đã công khai ở [`../../evidence/README.md`](../../evidence/README.md) — không lấy thêm nội dung nào khác từ pack.

**Việc cho CP3:** thay `DATA` trong `detail.html` bằng kết quả một lời gọi AI thật (phân loại trạng thái + đề xuất ưu tiên) chạy trên `data/discord-pack/`, đo trên tập đã gán nhãn ở `evidence/sample-annotations.json`.
