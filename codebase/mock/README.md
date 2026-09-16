# Mock CP3 — Discord Pulse

Mock bấm được (HTML/CSS/JS thuần, không cần build) thể hiện luồng 4 bước ở `spec.md §4`:

```
index.html (chọn ngày/server)
  → overview.html (tổng quan chủ đề + AI timing)
    → priority-list.html (danh sách ưu tiên + metrics bar + timer + confidence)
      → detail.html?id=... (nguồn + AI confidence + trích dẫn + TA xác nhận/sửa)
```

**Cách xem:** mở `index.html` trực tiếp bằng trình duyệt (double-click hoặc kéo vào tab), bấm qua các bước như người dùng thật.

## Khác biệt so với CP2

| Tính năng | CP2 | CP3 |
|---|---|---|
| Badge | MOCK — CP2 | CP3 — AI phân loại thật |
| AI timing | Không có | Hiển thị thời gian phân loại mỗi case |
| Confidence score | Không có | % confidence cho mỗi hội thoại |
| Citation validity | Không có | ✅ tick bên cạnh mỗi trích dẫn hợp lệ |
| Session timer | Không có | Đếm thời gian TA rà soát từ mở list đến xong |
| Agreement tracking | Không có | Toast khác nhau: TA đồng ý vs TA sửa |
| Summary banner | Không có | Tổng kết khi hoàn thành: time, agreed, corrected, citations |
| Metrics summary bar | Không có | Tổng hội thoại, chưa rõ, cần ngữ cảnh, resolved |

## Đánh giá CP3

Kết quả 5 metrics trên 5 case mẫu:

| Metric | Kết quả |
|---|---|
| Precision | 80% |
| Recall | 100% |
| Citation validity | 100% |
| TA agreement rate | 80% |
| Avg AI time | 1.26s/case |

Chi tiết tại [`../../eval/cp3_test_results.json`](../../eval/cp3_test_results.json) và [`../../eval/README.md`](../../eval/README.md).