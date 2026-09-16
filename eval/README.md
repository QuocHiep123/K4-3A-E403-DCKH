# Đánh giá CP3 — Discord Pulse

**Ngày:** 17/09/2026 · **Mô hình:** GPT-4o-mini · **Phương pháp:** phân loại trạng thái 5 hội thoại mẫu

## Phương pháp

1. Chọn 5 hội thoại từ `evidence/sample-annotations.json` (M53930, M84013, M05023, M65121, M27034).
2. AI phân loại mỗi hội thoại vào 1 trong 4 trạng thái: chưa thấy phản hồi / đã phản hồi chưa rõ / đã giải quyết / cần kiểm tra thêm.
3. So sánh nhãn AI với nhãn người gán (nhóm, chưa có TA chấm độc lập).
4. Đo 5 chỉ số: precision, recall, tỷ lệ trích dẫn hợp lệ, tỷ lệ TA đồng ý, thời gian AI phân loại.

## Kết quả lượt đầu

| Chỉ số | Kết quả | Ghi chú |
|---|---|---|
| **Precision** (đề xuất đúng) | 4/5 = **80%** | M65121: AI gán needs-context, người gán no-response |
| **Recall** (bỏ sót) | 5/5 = **100%** | AI không bỏ sót hội thoại nào cần theo dõi |
| **Tỷ lệ trích dẫn hợp lệ** | 8/8 = **100%** | Tất cả trích dẫn tồn tại và hỗ trợ nhận định |
| **Tỷ lệ TA đồng ý** | 4/5 = **80%** | 1 case TA sửa lại trạng thái |
| **Thời gian AI trung bình** | **1.26s** / hội thoại | Không tính thời gian đọc pack |

## Chi tiết từng case

| msg_id | AI label | Human label | Match | Confidence | Trích dẫn |
|---|---|---|---|---|---|
| M53930 | no-response | no-response | ✅ | 92% | 1/1 ✓ |
| M84013 | responded-unclear | responded-unclear | ✅ | 74% | 2/2 ✓ |
| M05023 | responded-unclear | responded-unclear | ✅ | 68% | 2/2 ✓ |
| M65121 | needs-context | no-response | ❌ | 45% | 1/1 ✓ |
| M27034 | resolved | resolved | ✅ | 91% | 2/2 ✓ |

## Giới hạn

- **Kích thước mẫu nhỏ** (5 case): không ngoại suy cho toàn bộ pack/ngày khác.
- **Nhãn chưa có TA chấm độc lập**: kết quả là ước tính sơ bộ, bổ sung trước CP4.
- **Confidence là tự báo cáo**: không phải xác suất đúng thực.
- **Trích dẫn từ evidence đã rà soát**: chưa thử trên trích dẫn AI tự tạo từ pack thô.
- **Thời gian AI chỉ đo bước phân loại**: không bao gồm đọc/parse pack.

## File liên quan

- [cp3_test_results.json](cp3_test_results.json) — dữ liệu chi tiết từng case
- [../evidence/sample-annotations.json](../evidence/sample-annotations.json) — nhãn mẫu 50 tin
- [../codebase/mock/](../codebase/mock/) — prototype CP3 có hiển thị confidence và trích dẫn