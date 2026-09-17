# Reflection Cá nhân — Đào Quang Cảnh

- **Họ và tên:** Đào Quang Cảnh
- **Mã học viên:** 2A202602542
- **Vai trò trong nhóm:** Evaluation & QA Lead (Nhóm DCKH - Track B2)

---

## 1. Phần việc đảm nhiệm trong dự án
- Xây dựng bộ dữ liệu kiểm thử chuẩn Golden Set gồm 20 case (`eval/golden_set.json`), phân loại chi tiết theo 4 lớp taxonomy chỗ khó, các case thường và case hiếm từ chatlog thật.
- Thiết lập định nghĩa kiểm chứng cho các chiều chất lượng: Precision, Recall (no-response), Tỷ lệ trích dẫn hợp lệ (Citation validity), và Thời gian phản hồi API.
- Thực hiện đo đạc đánh giá các lượt chạy mô hình thực tế, phân tích nguyên nhân sai lệch và lưu trữ kết quả trong `eval/cp3_test_results.json` và `eval/golden_set_results.json`.
- Chuẩn bị kịch bản và khung nhật ký dùng thử người dùng cho mốc CP5 (`validation/user_testing.md`).

## 2. AI đã hỗ trợ tôi như thế nào?
- **Hỗ trợ tạo biến thể câu hỏi (Paraphrasing):** Sau khi tôi chọn các mẫu hội thoại thật từ Discord pack, AI hỗ trợ mở rộng các kịch bản kiểm thử biên (edge cases) và kiểm tra định dạng JSON schema.
- **Tự động hóa tính toán ma trận nhầm lẫn (Confusion Matrix):** Dùng AI hỗ trợ viết script Python tính toán độ chính xác, tỷ lệ recall theo từng nhãn (`no-response`, `responded-unclear`, `resolved`, `needs-context`).

## 3. Một bài học lớn từ case fail của chính nhóm
- **Case fail thực tế:** Trong case kiểm thử M65121 (học viên hỏi cách nộp bài theo nhóm), AI đã phân loại thành `needs-context` thay vì `no-response` như nhãn người đã gán. Khi phân tích lỗi (failure analysis), tôi nhận thấy câu hỏi của học viên không có câu trả lời nào trong pack, nhưng mô hình lại nhầm tưởng rằng "do tin nhắn ngắn nên cần thêm ngữ cảnh ngoài". Kết quả là precision ở 5 case khó bị kéo xuống 80%.
- **Bài học rút ra:** Đánh giá AI không thể chỉ dừng lại ở vibe check "thấy trả lời cũng hợp lý". Phải có Golden Set với nhãn người rõ ràng và tiêu chí chấm độc lập. Việc mô hình đạt 80% precision thay vì 100% không phải là thất bại, mà là phát hiện quý giá để nhóm hiểu rằng ranh giới giữa "thiếu ngữ cảnh" và "chưa ai trả lời" rất mong manh. Nhóm đã ghi nhận trung thực con số này vào spec và slide thay vì cố tình sửa số liệu cho đẹp, đúng theo tinh thần liêm chính của khoa học dữ liệu.
