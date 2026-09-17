# Reflection Cá nhân — Nguyễn Thế Khang

- **Họ và tên:** Nguyễn Thế Khang
- **Mã học viên:** 2A202602964
- **Vai trò trong nhóm:** Product & Spec Lead (Nhóm DCKH - Track B2)

---

## 1. Phần việc đảm nhiệm trong dự án
- Nghiên cứu và phân tích sâu JTBD (Jobs To Be Done) của trợ giảng (TA/Learning Coach) khi rà soát thảo luận Discord cuối ngày.
- Khai phá dữ liệu (Mining): Phân tích tập 1.092 tin nhắn Discord khoá 4, bóc tách giữa tin nhắn bot (313 tin) và tin nhắn học viên (779 tin), phát hiện 7 lần bản tin ghi nhận nhãn "Đã có phản hồi, chưa xác nhận đã xử lý".
- Chấp bút và hoàn thiện toàn bộ tài liệu `spec.md` (§1 đến §9), xây dựng bảng so sánh impact 3 ứng viên, phân tích sản phẩm tương tự trên thị trường (Slack AI, Discourse, Intercom, Copilot), và xác lập 4 Non-goals.

## 2. AI đã hỗ trợ tôi như thế nào?
- **Hỗ trợ trích xuất & thống kê:** Dùng script Python kết hợp AI để rà soát nhanh 50 tin nhắn mẫu ngẫu nhiên theo thời gian, phân loại sơ bộ các nhóm nhu cầu hỗ trợ (28 câu hỏi/yêu cầu, 6 tin cần ngữ cảnh, 16 tin khác).
- **Soạn thảo và tinh chỉnh tài liệu:** Sử dụng AI để rà soát các lỗ hổng lập luận trong `spec.md`, kiểm tra xem các tuyên bố về nỗi đau có bị "ngụy tạo bằng chứng" hay không, từ đó giúp nhóm giữ vững nguyên tắc "nêu đúng sự thật, không phóng đại số liệu".

## 3. Một bài học lớn từ case fail của chính nhóm
- **Case fail thực tế:** Ở giai đoạn đầu viết Canvas CP1, tôi đã vô tình đưa mục tiêu "giúp TA chốt danh sách trong ≤5 phút" thành một khẳng định như thể đã được đo lường thực tế. Khi đối chiếu với rubric và nguyên tắc Mom Test, nhóm nhận ra đây chỉ là mục tiêu kỳ vọng chứ chưa hề có số liệu đo đạc thực nghiệm với TA thật.
- **Bài học rút ra:** Khoảng cách giữa "giả thuyết" và "bằng chứng kiểm chứng được" là ranh giới sống còn của một Product Lead. Khi làm sản phẩm AI, nếu vội vàng kết luận dựa trên cảm nhận cá nhân ("học viên nhắn nhiều nên TA chắc chắn mệt"), giải pháp sinh ra sẽ rất hời hợt. Việc nhóm dũng cảm ghi rõ trong spec "đây là giả thuyết có căn cứ mining, chưa đo được thời gian thực tế" giúp sản phẩm có độ tin cậy và sự trung thực cao hơn rất nhiều trong mắt ban giám khảo.
