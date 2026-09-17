# Reflection Cá nhân — Đặng Quốc Hiệp

- **Họ và tên:** Đặng Quốc Hiệp
- **Mã học viên:** 2A202602755
- **Vai trò trong nhóm:** Đội trưởng / AI Lead (Nhóm DCKH - Track B2)

---

## 1. Phần việc đảm nhiệm trong dự án
- Quản lý tiến độ chung của nhóm, điều phối 4 thành viên theo các mốc Checkpoint (CP1 đến CP6).
- Thiết kế luồng quyết định trung tâm của AI: định nghĩa taxonomy 4 lớp chỗ khó (nguồn sự thật, mơ hồ, thẩm quyền, domain) và kịch bản ứng phó.
- Thiết kế hệ thống Prompt và logic phân loại trạng thái hội thoại trong `codebase/analyze.py`.
- Đại diện nhóm chuẩn bị dữ liệu và thực hiện nộp các form Checkpoint đúng hạn.

## 2. AI đã hỗ trợ tôi như thế nào?
- **Tư duy kiến trúc & prompt refinement:** Sử dụng Claude / Gemini để brainstorm các tình huống edge-case hiếm gặp trong Discord và chuyển hoá thành prompt có kèm quy tắc fallback rõ ràng.
- **Rà soát tính chặt chẽ:** Dùng LLM để phản biện lại các giả định trong spec, đảm bảo lát cắt "1 câu" không bị lẫn lộn giữa việc tóm tắt nội dung với việc hỗ trợ ra quyết định.
- **Tạo khung tài liệu & kịch bản:** Sinh khung sơ đồ Mermaid cho luồng xử lý và đối chiếu nhanh các nguyên tắc HAX.

## 3. Một bài học lớn từ case fail của chính nhóm
- **Case fail thực tế:** Trong lần chạy đầu tiên với mô hình `nvidia/nemotron-3-ultra-550b-a55b` qua OpenRouter free-tier, hệ thống gặp tình trạng rate limit và hàng đợi phản hồi kéo dài ~15.9s/case, khiến một số case bị timeout hoặc trả về kết quả rỗng (confidence = 0). Ngoài ra, ban đầu prompt chưa phân biệt được sự khác nhau giữa "đã có bot/TA phản hồi câu hỏi chẩn đoán" (`responded-unclear`) với "vấn đề đã được học viên xác nhận giải quyết" (`resolved`).
- **Bài học rút ra:** Không bao giờ phụ thuộc vào một endpoint duy nhất của mô hình miễn phí khi demo thực chiến; cần luôn có cơ chế retry / fallback model hoặc lưu trữ kết quả kiểm thử cố định (`cached results`). Về mặt tư duy sản phẩm, việc "bật phản hồi" chỉ là tín hiệu bề mặt, bản chất công việc của TA là "kết quả học tập của học viên đã thông chưa". Thiết kế AI cho giáo dục đòi hỏi sự cẩn trọng về mặt ngữ nghĩa (semantic grounding) cao hơn nhiều so với chatbot thông thường.
