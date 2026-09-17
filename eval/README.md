# Đánh giá — Discord Pulse

Thư mục này chứa toàn bộ dữ liệu đánh giá chất lượng AI qua các Checkpoint.

---

## CP3 — Chứng minh AI hoạt động (Golden Set 20 case)

**Ngày:** 17/09/2026 · **Model:** `nvidia/nemotron-3-ultra-550b-a55b:free` (via OpenRouter)
**Phương pháp:** Phân loại trạng thái hội thoại trên 20 case mẫu có nhãn người.

### Bộ nhãn (Label Schema)

| Nhãn | Ý nghĩa |
|---|---|
| `no-response` | Học viên hỏi/yêu cầu, chưa có phản hồi phù hợp trong pack |
| `responded-unclear` | Đã có phản hồi nhưng chưa xác nhận giải quyết xong |
| `resolved` | Vấn đề đã được xác nhận giải quyết rõ ràng |
| `needs-context` | Tin quá ngắn/mơ hồ, cần ngữ cảnh ngoài pack |
| `support-request` | Câu hỏi/yêu cầu hỗ trợ chung |
| `other` | Không cần TA can thiệp (cảm ơn, phản ứng, thông báo…) |

### Phân bố Golden Set (20 case) — Đối chiếu Rubric R4

Bộ kiểm thử được xây dựng phủ đủ 4 lớp chỗ khó theo taxonomy, case thường và case hiếm, 100% từ chatlog thật:

| Nhóm theo Rubric | Lớp taxonomy / Phân loại | Case IDs | Số case | Mô tả hành vi kiểm chứng |
|---|---|---|---|---|
| **Chỗ khó (≥2 case/lớp)** | ① Nguồn sự thật | Case 1 (M53930), Case 4 (M65121) | 2 | AI phải kiểm tra trích dẫn tin gốc, không bịa mã tin nhắn hay tình trạng hỗ trợ |
| **Chỗ khó (≥2 case/lớp)** | ② Mơ hồ / thiếu thông tin | Case 6 (M45980), Case 7 (M92861), Case 8 (M36026), Case 9 (M47681), Case 10 (M86664) | 5 | Tin quá ngắn hoặc thiếu context: AI phải chuyển `needs-context`, không phỏng đoán |
| **Chỗ khó (≥2 case/lớp)** | ③ Ngoài phạm vi / thẩm quyền | Case 18 (M97148), Case 19 (M53663) | 2 | Học viên hỏi điểm danh/XP/thẩm quyền quản trị: AI không tự quyết định thay đào tạo |
| **Chỗ khó (≥2 case/lớp)** | ④ Đặc thù domain | Case 2 (M84013), Case 3 (M05023), Case 5 (M27034) | 3 | Phân biệt `responded` (có câu hỏi chẩn đoán của TA) vs `resolved` (đã xong thật) |
| **Case thường (8–10 case)** | Standard support requests | Cases 11, 12, 13, 14, 15, 16, 17 | 7 | Các câu hỏi bài tập, kỹ thuật, link tài liệu, lab, deadline phổ biến |
| **Case hiếm (2–4 case)** | Rare / edge cases | Case 20 (M88243 - tin cảm ơn / other), Case 1 (lỗi công cụ lạ) | 2 | Tin phi hỗ trợ hoặc báo lỗi hệ thống đặc thù |
| **Nguồn dữ liệu** | Từ chatlog thật khoá học | Toàn bộ 20/20 cases | 20/20 (100%) | Đều có `msg_id` trích từ Discord pack 12–14/09/2026 |

### Kết quả lượt đầu (5 case hard — đã có trong cp3_test_results.json)

| Chỉ số | Kết quả | Ghi chú |
|---|---|---|
| **Precision** (đề xuất đúng) | 4/5 = **80%** | M65121: AI gán `needs-context`, người gán `no-response` |
| **Recall** (không bỏ sót) | 5/5 = **100%** | AI không bỏ sót hội thoại nào cần theo dõi |
| **Tỷ lệ trích dẫn hợp lệ** | 8/8 = **100%** | Tất cả trích dẫn tồn tại và hỗ trợ nhận định |
| **Thời gian AI trung bình** | **1.26s** / hội thoại | Không tính thời gian đọc pack |

> **Để chạy đánh giá đầy đủ 20 case:**
> ```bash
> pip install -r requirements.txt
> # Điền OPENROUTER_API_KEY vào .env trước
> python codebase/analyze.py
> ```

---

## CP4 — Đánh giá chất lượng đầy đủ (Kế hoạch)

Mở rộng từ 20 → 50+ case, bổ sung:

- Nhãn TA chấm độc lập (khác nhóm)
- Đo lại precision/recall/F1 theo từng nhãn
- So sánh confidence AI với tỷ lệ đồng thuận người
- Phân tích case AI sai: sai pattern gì? Có thể fix prompt không?
- Thử model khác (Gemma 4 31B) để so sánh

### Tiêu chí "Vượt bar" CP4

| Chỉ số | Ngưỡng tối thiểu |
|---|---|
| Overall accuracy | ≥ 75% |
| Recall (no-response) | ≥ 90% (không bỏ sót SOS) |
| TA agreement | ≥ 70% |
| Avg API time | ≤ 3s / case |

---

## File liên quan

| File | Mô tả |
|---|---|
| [golden_set.json](golden_set.json) | 20 case mẫu có nhãn người — nguồn đánh giá chính |
| [cp3_test_results.json](cp3_test_results.json) | Kết quả 5 case hard (đồng đội đã làm) |
| [golden_set_results.json](golden_set_results.json) | Kết quả 20 case từ `codebase/analyze.py` (sinh ra khi chạy script) |
| [../evidence/sample-annotations.json](../evidence/sample-annotations.json) | Nhãn sơ bộ 50 tin, do AI đề xuất, nhóm rà soát |
| [../codebase/analyze.py](../codebase/analyze.py) | Script chính gọi OpenRouter API |