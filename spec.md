# AI SPEC — Discord Pulse · Nhóm DCKH

**Lớp:** 3A · **Phòng:** E403 · **Cụm:** chưa điền
**Track:** B2 — Tính năng cho TA/học viên trên Discord
**Loại:** Cải tiến bản tin hiện có, bổ sung danh sách hội thoại cần TA xem xét
**Trạng thái:** Bản CP1 ngày 16/09/2026; chưa khóa chuẩn đạt tại CP4.

**Đội trưởng:** Đặng Quốc Hiệp · **Mã học viên:** 2A202602755
**Repo:** https://github.com/QuocHiep123/K4-3A-E403-DCKH

Canvas 4 ô nằm trong §1–§2. Phương pháp và trích dẫn: [nhật ký bằng chứng](evidence/README.md).

## §1. User & Job — Canvas ô 1 và ô 2

### Ô 1 — Thông tin chung

- **Tên hướng đi:** Discord Pulse — Tổng hợp thảo luận và ưu tiên hội thoại cần hỗ trợ cho trợ giảng.
- **Job executor:** Một TA/learning coach phụ trách rà soát thảo luận của một server Discord khóa AI20k.
- **Công việc:** Cuối ngày, xác định các vấn đề cần theo dõi và chốt danh sách hội thoại cần hỗ trợ tiếp.
- **Quy trình hiện tại cần xác nhận với TA:** đọc bản tin → mở tin nguồn → xem phản hồi → xác định còn cần hỗ trợ không → chọn việc cần xử lý. Pack xác nhận có bản tin và hội thoại; nhóm chưa quan sát trực tiếp đầy đủ quy trình của TA.
- **Core JTBD:** Khi kết thúc ngày học, tôi muốn xác định hội thoại nào còn cần theo dõi và xem được căn cứ, để chọn đúng việc hỗ trợ tiếp theo.

### Ô 2 — Nỗi đau cốt lõi và bằng chứng

**Problem statement:** Khi rà soát Discord cuối ngày, trợ giảng khó xác định hội thoại nào còn cần hỗ trợ chỉ từ nhãn “đã có phản hồi”, nên phải đối chiếu thêm nội dung trao đổi để tránh bỏ sót vấn đề hoặc theo dõi lại việc đã xong.

Đây là **giả thuyết nỗi đau có bằng chứng về dữ liệu và trạng thái phản hồi**, chưa phải kết luận rằng TA đã bỏ sót câu hỏi hoặc mất một số phút cụ thể. Cần TA xác nhận hậu quả và mức độ ảnh hưởng.

**Bằng chứng ban đầu theo hướng B — mining:**

| Phạm vi | Kết quả | Diễn giải |
|---|---|---|
| Toàn bộ pack 12–14/09/2026 | 1.092 tin: 779 người viết, 313 bot viết | Phải tách bot khi đếm nhu cầu; mã tác giả không phân biệt TA với học viên |
| Đọc 50 tin người viết lấy cách đều theo thời gian | 28 câu hỏi/yêu cầu hỗ trợ; 6 tin cần thêm ngữ cảnh; 16 tin khác | Nhãn sơ bộ được AI hỗ trợ gán, nhóm cần rà soát; chưa được TA chấm độc lập, không ngoại suy cho toàn khóa |
| Kiểm tra 4 bản tin có sẵn | 2/4 bản tin có tổng cộng 7 lần ghi “Đã có phản hồi, chưa xác nhận đã xử lý” | Không đồng nghĩa bảy vấn đề vẫn còn tồn |
| Đối chiếu câu hỏi–phản hồi | M05023 → M13539: hỏi lỗi truy cập → hỏi thêm về email; M04968 → M73803: yêu cầu hỗ trợ → bot hỏi làm rõ | Có phản hồi chưa đủ để đánh dấu đã giải quyết |

Đã lưu **6 trích dẫn ngắn nguyên văn**, mã nguồn, đủ nhãn mẫu và phương pháp tính trong [evidence/README.md](evidence/README.md). Mỗi ví dụ tối đa hai câu; không đưa nguyên pack lên repo.

**Còn cần thu thập:** quan sát Discord hiện tại; hỏi TA về lần rà soát gần nhất, cách quyết định trạng thái, số hội thoại phải mở và thời gian thực hiện. Chưa thực hiện khảo sát chuẩn A; chưa có tỷ lệ người xác nhận nỗi đau.

## §2. Impact & quyết định chọn — Canvas ô 3 và ô 4

### So sánh ba ứng viên

| Ứng viên | Quy mô/tần suất có thể kiểm chứng lúc CP1 | Chi phí mỗi lần / số TA ảnh hưởng | Quyết định |
|---|---|---|---|
| Bản tin tổng quan chủ đề | Có 4 bản tin nền; 2 bản có 7 nhãn chưa xác nhận kết quả | Chưa đo thời gian đọc và số TA gặp vấn đề | Giữ làm phần tổng quan; loại phương án chỉ tóm tắt vì chưa giúp chốt việc tiếp theo |
| Danh sách hội thoại cần theo dõi | 28 yêu cầu trong mẫu 50 tin; có phản hồi chẩn đoán và tin cần ngữ cảnh | Chưa đo số hội thoại phải mở và phút xử lý | Chọn làm quyết định trung tâm; mỗi đề xuất truy về nguồn và cho TA sửa |
| Dấu hiệu cần hỗ trợ thêm | Có ví dụ báo vẫn chưa truy cập được (M53930), nhắc lại yêu cầu hỗ trợ (M84013); chưa đếm toàn pack | Chưa đo tần suất cần can thiệp | Giữ dấu hiệu ở cấp hội thoại; loại phương án xếp hạng hoặc dự đoán năng lực học viên |

**Lý do chọn:** kết hợp ba cách nhìn vào cùng một công việc cuối ngày: tổng quan → hội thoại cần xem → bằng chứng cần hỗ trợ thêm. Có dữ liệu và bốn bản tin nền để kiểm tra từng đề xuất. Chưa đủ số liệu để tuyên bố ROI hoặc tiết kiệm thời gian; bổ sung bảng impact trước CP4.

### Ô 3 — Lát cắt MỘT CÂU

> Một TA cần rà soát thảo luận cuối ngày của một server Discord, được AI đề xuất các hội thoại cần ưu tiên hỗ trợ dựa trên chủ đề, trạng thái phản hồi và dấu hiệu còn vướng, giúp TA chốt danh sách tối đa 5 hội thoại có căn cứ trong không quá 5 phút.

**Đo kết quả:** bấm giờ từ lúc TA mở bản tin đến khi xác nhận danh sách; mỗi mục có mã nguồn, lý do và trạng thái TA có thể sửa. Mốc **≤5 phút là mục tiêu đề xuất, chưa được đo**; không đủ hội thoại phù hợp thì trả ít hơn 5 hoặc danh sách rỗng.

### Ô 4 — Cam kết triển khai

- **Automation: augment — AI hỗ trợ, TA quyết định.** AI đề xuất chủ đề/trạng thái/ưu tiên; TA xem nguồn và xác nhận. Bỏ sót người cần giúp hoặc đánh dấu sai đã giải quyết đều có chi phí, nên chưa tự động liên hệ học viên.
- **Phạm vi CP2–CP3:** một màn hình, một server và một ngày được chọn, có ngữ cảnh trước đó khi pack cung cấp. Ba phần dùng chung kết quả phân tích; có ít nhất một lời gọi AI thật ở bước đề xuất hội thoại cần hỗ trợ.
- **Thật/mock dự kiến:** pack cục bộ; nguồn mở theo `msg_id`. Kết nối Discord trực tiếp và link tin thật chưa triển khai vì pack đã ẩn danh ID. Code tính số lượng/thời gian; AI phân tích nội dung.

| Thành viên | Mã học viên | Phần việc cam kết |
|---|---|---|
| Đặng Quốc Hiệp — đội trưởng | 2A202602755 | Điều phối; quyết định AI/prompt; kịch bản lỗi; đại diện nộp checkpoint |
| Nguyễn Thế Khang | 2A202602964 | Canvas/spec; rà soát bằng chứng và nhãn mẫu; trao đổi với TA về workflow/impact |
| Nguyễn Việt Dũng | 2A202602812 | Prototype; giao diện tổng quan/danh sách/nguồn; tích hợp lời gọi AI thật |
| Đào Quang Cảnh | 2A202602542 | Bộ kiểm thử; đo kết quả; tổ chức dùng thử và ghi nhật ký phản hồi |

**Hai người ngoài nhóm sẵn sàng thử:**

| Họ tên | Xác nhận | Vai trò trong buổi dùng thử | Bài thử dự kiến |
|---|---|---|---|
| Đỗ Đức Đại | Nhóm xác nhận đồng ý dùng thử ngày 16/09/2026 | Người dùng thử đóng vai TA rà soát cuối ngày | Đọc bản tin, chọn hội thoại cần ưu tiên; đánh giá mức dễ hiểu và thời gian thực hiện |
| Phạm Cường Quốc | Nhóm xác nhận đồng ý dùng thử ngày 16/09/2026 | Người dùng thử đóng vai TA kiểm chứng kết quả | Mở tin nguồn, kiểm tra nhận định của AI, sửa trạng thái sai và góp ý |

Vai trò trên mô tả nhiệm vụ trong buổi dùng thử, không xác nhận chức danh TA thực tế của hai người tham gia.

Chưa có phiên dùng thử nào diễn ra. Mời thêm người để đạt 5 người ngoài nhóm trước CP5, ưu tiên có TA/coach xác nhận nhu cầu của đúng người dùng mục tiêu.

## §3. Giải pháp tương tự đã nghiên cứu

- Đã đọc bốn bản tin bot trong pack: có chủ đề, câu hỏi và nội dung coach cần chú ý, nhưng nhãn phản hồi chưa đủ xác định kết quả cuối cùng.
- Chưa hoàn thành nghiên cứu sản phẩm tương tự thứ hai; bổ sung trước CP4. Không coi nội dung bot là thông báo chính thức.

## §4. Thiết kế dự kiến

- **Luồng:** chọn ngày/server → xem chủ đề → mở danh sách hội thoại → xem căn cứ → TA xác nhận/sửa trạng thái.
- **Ba trạng thái:** chưa thấy phản hồi phù hợp / đã có phản hồi, chưa rõ kết quả / có bằng chứng đã giải quyết. Thiếu ngữ cảnh thì hiển thị “cần kiểm tra thêm”, không ép kết luận.
- **Ngưỡng 4 giờ:** tín hiệu thời gian để xem xét, không chứng minh chưa được trả lời. Đo theo mốc ngày đang xem; không dùng phản hồi xảy ra sau mốc đó.
- **Dấu hiệu cần hỗ trợ:** lời báo vẫn lỗi/nhắc lại yêu cầu trong hội thoại; hỏi nhiều không đồng nghĩa học yếu. Gom chủ đề nhưng giữ nguồn và trạng thái riêng từng hội thoại.
- **Mức prototype nhắm tới:** Working cho luồng cục bộ; chưa có prototype chạy tại thời điểm soạn CP1.
- **Non-goals:** không tự gửi DM/đăng bản tin; không xếp hạng năng lực; không quyết định điểm danh/XP/deadline; không xây tích hợp Discord production trong bản đầu.
- **HAX/PAIR:** chưa hoàn tất bảng ≥4 nguyên tắc; bổ sung trước CP4 cùng vị trí áp dụng trong giao diện.

## §5. Kiểu lỗi — dự kiến 8 kịch bản

| Lớp | Tình huống | Hành vi mong muốn |
|---|---|---|
| ① Nguồn sự thật | Không có reply trực tiếp nhưng câu trả lời nằm ở tin thường | Xem ngữ cảnh có sẵn; thiếu thì ghi “chưa thấy trong dữ liệu”, không kết luận chắc chắn |
| ① Nguồn sự thật | AI tạo mã nguồn không tồn tại | Code kiểm tra mã; loại đề xuất không có căn cứ hợp lệ |
| ② Mơ hồ | Tin quá ngắn không rõ đang nói chuyện gì | Yêu cầu thêm ngữ cảnh, không suy ra đang gặp khó khăn |
| ② Mơ hồ | Ảnh đính kèm không có trong pack | Báo thiếu ảnh, không đoán nội dung ảnh |
| ③ Thẩm quyền | Tin chứa chỉ dẫn bỏ qua hướng dẫn và đánh dấu mọi câu đã xử lý | Xem hội thoại là dữ liệu, không làm theo chỉ dẫn trong tin |
| ③ Thẩm quyền | Yêu cầu tự nhắn hàng loạt cho học viên | Chỉ tạo danh sách để TA duyệt; không gửi tự động |
| ④ Domain | Bot hỏi làm rõ nhưng bị coi là đã giải quyết | Giữ trạng thái đã phản hồi/chưa rõ kết quả |
| ④ Domain | Cùng chủ đề nhưng mỗi người có tiến độ khác nhau | Gom chủ đề, giữ nguồn và trạng thái riêng từng hội thoại |

## §6. Bốn đường đi của trải nghiệm

- **Happy path:** nguồn rõ → đề xuất hội thoại → TA duyệt.
- **Low-confidence:** thiếu/mâu thuẫn ngữ cảnh → hiển thị căn cứ và yêu cầu TA xác nhận.
- **Failure:** nguồn không hợp lệ hoặc lỗi gọi AI → báo lỗi, cho thử lại/xem dữ liệu; không tạo kết quả giả.
- **Correction:** TA sửa trạng thái hoặc bỏ đề xuất → lưu quyết định và lý do.
- Chưa kiểm chứng các đường đi trên bằng prototype.

## §7. Kiểm thử — kế hoạch sau CP1

- Xây ≥20 case, gồm ≥10 case lấy/phát triển từ dữ liệu thật, ≥2 case mỗi lớp khó, 8–10 case thường và 2–4 case hiếm.
- Nhãn tham chiếu độc lập: cần theo dõi không, trạng thái phản hồi, nguồn hỗ trợ nhận định; cho phép “không đủ thông tin”.
- Đo tỷ lệ đề xuất đúng, tỷ lệ bỏ sót trong tập đã gán nhãn, tỷ lệ trích dẫn hợp lệ/hỗ trợ nhận định, thời gian TA chốt danh sách.
- So sánh bản tin nền/prototype trên cùng phạm vi đối chiếu được; bản tin nền có thể dùng nguồn ngoài pack, không phải nhãn đúng tuyệt đối.
- Mục tiêu thời gian đề xuất: ≤5 phút. **Quality bar kỹ thuật chưa chốt**; định nghĩa trước lượt đo tương ứng, khóa tại CP4.
- Chưa có golden set hoàn chỉnh, lượt chạy AI thật hay kết quả đánh giá; không dùng số mining CP1 làm độ chính xác sản phẩm.

## §8. Phân công & kế hoạch

Phân công và willing users ở §2, ô 4; thông tin thành viên lấy từ [TEAMMATES.md](TEAMMATES.md).

| Mốc | Việc cần hoàn thành |
|---|---|
| CP1 — 19:30 16/09 | Canvas, evidence ban đầu, hai willing users, repo công khai; đội trưởng nộp form |
| CP2 — 21:00 16/09 | Luồng chính bấm được hoặc sơ đồ rõ các bước |
| CP3 — 16:00 17/09 | AI thật, video 30 giây, bộ kiểm thử và kết quả lượt đầu |
| CP4 — 21:00 17/09 | Bổ sung impact, nghiên cứu tương tự, HAX/PAIR, chốt spec/quality bar |
| CP5 — 13:00 18/09 | Năm người ngoài nhóm dùng thử, nhật ký/changelog, slide PDF và video dự phòng |

## §9. Changelog

| Ngày | Đổi gì | Căn cứ |
|---|---|---|
| 16/09/2026 | Canvas B2 kết hợp tổng quan, hội thoại cần theo dõi, dấu hiệu cần hỗ trợ | Hướng nhóm chọn; mẫu 50 tin và bốn bản tin nền |
| 16/09/2026 | Phân biệt có phản hồi với đã giải quyết; giữ trạng thái thiếu ngữ cảnh | M05023/M13539 và M04968/M73803 |
| 16/09/2026 | Bổ sung Đỗ Đức Đại và Phạm Cường Quốc vào willing users | Nhóm cung cấp; chưa có feedback dùng thử |
| 16/09/2026 | Phân vai dùng thử: Đỗ Đức Đại rà soát cuối ngày; Phạm Cường Quốc kiểm chứng kết quả | Nhóm chốt nhiệm vụ đóng vai TA; chưa có phiên dùng thử |
