# Reflection Cá nhân — Nguyễn Việt Dũng

- **Họ và tên:** Nguyễn Việt Dũng
- **Mã học viên:** 2A202602812
- **Vai trò trong nhóm:** Prototype & Frontend Lead (Nhóm DCKH - Track B2)

---

## 1. Phần việc đảm nhiệm trong dự án
- Thiết kế và lập trình toàn bộ giao diện prototype tương tác trong `codebase/` và `codebase/mock/` bằng HTML/CSS/JavaScript thuần (không cần môi trường build phức tạp, chạy trực tiếp trên file://).
- Xây dựng luồng trải nghiệm 4 bước chuẩn HAX: Chọn phạm vi (`index.html`) → Tổng quan chủ đề (`overview.html`) → Danh sách ưu tiên (`priority-list.html`) → Soi căn cứ & duyệt quyết định (`detail.html`).
- Hiện thực hoá 4 đường đi trải nghiệm (Happy path, Low-confidence, Failure/no-grounding, Correction) và tích hợp các chỉ số niềm tin (confidence bar, citation badge).
- Viết bộ 7 unit test logic (`browser.test.cjs` / `model.test.js`) và tài liệu kiểm chứng kỹ thuật (`codebase/verification.md`).

## 2. AI đã hỗ trợ tôi như thế nào?
- **Tốc độ scaffolding giao diện:** Dùng AI sinh nhanh các thành phần UI mô phỏng theme Discord (dark palette, card, badge, timeline, session timer) giúp tiết kiệm 70% thời gian dựng layout.
- **Tạo mockup test cases:** Nhờ AI viết các kịch bản tương tác giả lập trong `codebase/mock/` với đầy đủ trạng thái dữ liệu (đủ căn cứ, thiếu ảnh, mã nguồn hỏng DEMO-MISSING, lỗi timeout).
- **Hỗ trợ debug test runner:** Dùng AI cấu hình kiểm thử tự động với Puppeteer/Node test runner để đảm bảo cả 7/7 test case đều pass xanh.

## 3. Một bài học lớn từ case fail của chính nhóm
- **Case fail thực tế:** Trong phiên bản CP2 đầu tiên, form duyệt quyết định cho phép người dùng bấm "Lưu quyết định" và "Chốt danh sách" ngay cả khi chưa hề mở xem tin nhắn nguồn (nguyên tắc G11/G10 bị vi phạm). Điều này dẫn đến nguy cơ TA phê duyệt mù quáng theo gợi ý của AI (automation complacency).
- **Bài học rút ra:** Thiết kế UI cho AI khác biệt hoàn toàn với UI CRUD truyền thống. Một UI tốt cho AI phải chủ động ngăn chặn sự lười biếng của người dùng bằng cách bắt buộc phải có thao tác kiểm chứng (forcing function): phải click mở tin nguồn thì nút lưu mới được kích hoạt, khi sửa nhận định của AI thì bắt buộc phải nhập lý do. Thà làm người dùng chậm lại 5 giây để kiểm tra còn hơn để AI đưa ra quyết định sai mà không ai hay biết.
