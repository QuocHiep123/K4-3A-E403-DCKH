# AI SPEC — Discord Pulse · Nhóm DCKH

**Lớp:** 3A · **Phòng:** E403 · **Cụm:** chưa điền
**Track:** B2 — Tính năng cho TA/học viên trên Discord
**Trạng thái:** CP3 hoàn thiện 17/09/2026 — giao diện 4 bước (`codebase/mock/`), AI thật qua OpenRouter (nvidia/nemotron), golden set 20 case. CP4 bổ sung impact table, nghiên cứu tương tự, chốt quality bar. Kiểm chứng CP2 tại [codebase/verification.md](codebase/verification.md); kết quả eval tại [eval/README.md](eval/README.md).

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
- **Phạm vi CP2:** một màn hình, một server/ngày trong mỗi lượt; dữ liệu tự tạo và đề xuất dựng sẵn. TA mở nguồn, sửa/duyệt và chốt danh sách bằng tương tác thật trong trình duyệt.
- **Mục tiêu CP3:** thêm ít nhất một lời gọi AI thật để đề xuất hội thoại; đọc pack cục bộ theo `msg_id`. Kết nối Discord trực tiếp và link tin thật chưa triển khai vì pack đã ẩn danh ID. Không coi mock CP2 là bằng chứng AI chạy thật.

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

**Bên trong pack — bản tin bot hiện có:**
- Đã đọc 4 bản tin bot trong pack (`k4_daily_reports.md`): có chủ đề, câu hỏi và nội dung coach cần chú ý, nhưng nhãn "Đã có phản hồi, chưa xác nhận đã xử lý" không đủ để TA quyết định hội thoại nào còn cần xem.
- Bản tin hiện tại thiếu: danh sách ưu tiên theo mức cần hỗ trợ, confidence indicator, cơ chế TA sửa có lưu lý do và audit log.

**So sánh với giải pháp bên ngoài (CP4):**

| Giải pháp | Chức năng tương tự | Điểm Discord Pulse khác biệt |
|---|---|---|
| Slack AI Summary (Slack 2024) | Tóm tắt kênh theo chủ đề | Không phân loại trạng thái cần hỗ trợ; không có TA sửa + ghi lý do |
| Discourse AI Summarize | Gom thread theo chủ đề | Diễn đàn tĩnh, không real-time; không có urgency prioritization |
| Intercom AI Triage | Phân loại ticket theo độ ưu tiên | B2B customer support; không có nhãn "responded-unclear" quan trọng với TA dạy học |
| Linear/GitHub Copilot for Issues | Gợi ý ưu tiên issue | Dành cho dev workflow; không map sang bài toán học tập Discord |

**Lý do Discord Pulse cần thiết:** Không có sản phẩm nào trên giải quyết đúng bài toán TA rà soát cuối ngày — cần phân biệt *có phản hồi* với *đã giải quyết*, cần TA đọc căn cứ trước khi quyết định, và cần ghi lý do khi sửa để audit. Đây là thiết kế HAX augment (G1, G2, G8-G11), không phải automate.

## §4. Thiết kế CP2 — bản mẫu tương tác

**Mức prototype: Mock.** [Mã nguồn / hướng dẫn chạy](codebase/README.md) · [Bản mẫu HTML](codebase/index.html) · [Sơ đồ luồng đầy đủ](codebase/flow.md) · [Kiểm chứng](codebase/verification.md).

**Link kiểm chứng để nộp:** https://github.com/QuocHiep123/K4-3A-E403-DCKH/tree/main/codebase. GitHub hiển thị mã; tải repo và mở `codebase/index.html` để bấm thử. Sơ đồ Mermaid xem được ngay trong `codebase/flow.md` trên GitHub.

### Hành trình và quyền quyết định

1. TA đọc thông báo khả năng/giới hạn; chọn server, ngày và kịch bản. “Tạo lượt rà soát” bắt đầu một lượt, thay thế lượt trước.
2. Tại điểm quyết định AI, hệ thống trả đề xuất trạng thái, lý do và nguồn **giả lập**. Màn hình có danh sách chủ đề/hội thoại bên trái và chi tiết bên phải.
3. TA mở tin nguồn trước khi phần quyết định được bật. Nhãn “Đủ căn cứ · giả lập” hoặc “Chưa chắc chắn” đi kèm lý do cụ thể; không dùng phần trăm tin cậy chưa được hiệu chuẩn.
4. TA chọn **Cần theo dõi / Cần kiểm tra thêm / Đã giải quyết / Bỏ khỏi đề xuất**. Khi sửa đề xuất hoặc xử lý thiếu chắc chắn, phải ghi lý do/việc cần làm tiếp. Lưu quyết định giữ lại đề xuất AI ban đầu để đối chiếu.
5. Duyệt hết hội thoại mới được chốt. Chỉ hai trạng thái đầu vào danh sách theo dõi, tối đa 5 mục; có thể chốt 0 mục. Kết quả hiển thị phạm vi, quyết định, ghi chú, mã nguồn và thông báo chưa gửi Discord.
6. TA có thể tải JSON để lưu kết quả và lịch sử sửa, hoặc quay lại chỉnh sửa rồi chốt lại. Quyết định chỉ ở trong tab; tải lại/đóng tab mất dữ liệu chưa xuất. Giao diện báo rõ giới hạn này.

**Automation: augment.** Chi phí sai gồm bỏ sót người cần giúp và đánh dấu nhầm đã giải quyết. AI chỉ đề xuất; TA đọc căn cứ, sửa và chốt. Không tự nhắn, tự đăng bản tin, tự đánh dấu trên Discord; không xếp hạng năng lực học viên hoặc quyết định điểm danh/XP/deadline.

### Non-goals (Phạm vi không làm)
Để đảm bảo an toàn và tập trung đúng lát cắt, hệ thống cam kết bản build không vi phạm 4 non-goals sau:
1. **Không tự động nhắn tin / tag / gửi thông báo trực tiếp cho học viên trên Discord**: Tránh làm phiền học viên và loại trừ rủi ro AI phát ngôn sai lệch nhân danh ban tổ chức hoặc trợ giảng.
2. **Không xếp hạng năng lực học viên, không quyết định điểm danh/XP/deadline**: AI không can thiệp vào thẩm quyền quản trị đào tạo hay đánh giá học viên; chỉ hỗ trợ TA phát hiện người cần giúp.
3. **Không tự động đóng hoặc đánh dấu "đã giải quyết" trên thread Discord**: Quyền quyết định trạng thái cuối cùng luôn thuộc về TA sau khi đã đối chiếu căn cứ tin nhắn gốc.
4. **Không suy đoán nội dung hình ảnh đính kèm khi thiếu dữ liệu**: Khi tin nhắn chứa ảnh không có trong pack hoặc ngữ cảnh bị cắt, hệ thống bắt buộc chuyển sang trạng thái "Cần kiểm tra thêm" thay vì phỏng đoán.

**Quy tắc thiết kế:** có phản hồi chưa đồng nghĩa đã giải quyết. Thiếu ngữ cảnh thì “Cần kiểm tra thêm”; không đoán nội dung ảnh. Gom theo chủ đề nhưng giữ quyết định và căn cứ riêng mỗi hội thoại. Ngưỡng 4 giờ chỉ là tín hiệu dự kiến cho CP3, chưa được tính trong mock CP2 và không chứng minh chưa được trả lời. Khi nối pack thật, phải cắt dữ liệu tại mốc ngày rà soát, không dùng phản hồi tương lai.

### Phần chạy thật và phần mock

| Thành phần | CP2 hiện tại | Tiếp theo |
|---|---|---|
| Nhập phạm vi, mở nguồn, sửa/bỏ/duyệt, kiểm tra lý do và số mục | HTML/CSS/JS chạy thật, không cần build | Giữ luồng khi nối AI |
| Chốt danh sách, mở lại, tải JSON và lịch sử quyết định | Chạy thật trong tab và tệp tải xuống; không có lưu máy chủ | Cân nhắc lưu bền vững sau dùng thử |
| Tin nhắn / chủ đề / mã nguồn | Ví dụ tự tạo có tiền tố DEMO; hai server/hai ngày dùng chung mẫu | CP3 đọc pack cục bộ theo mã nguồn |
| Phân tích AI, confidence, lỗi/no-grounding, retry | Kịch bản dựng sẵn; retry chủ động chuyển sang happy giả lập | CP3 có ≥1 lời gọi AI thật và kiểm tra nguồn trả về |
| Discord, xác thực, gửi tin | Chưa triển khai | Ngoài phạm vi bản đầu |

### Nguyên tắc HAX và vị trí áp dụng

Chọn **6 nguyên tắc**, gồm G10 bắt buộc. Tham chiếu: [Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/); tên nguyên tắc theo bản hướng dẫn HAX của BTC đã đọc tại CP1–CP2. Đây là lựa chọn thiết kế, chưa phải kết quả đánh giá với người dùng.

| Nguyên tắc | Vị trí cụ thể trong bản mẫu | Cách kiểm chứng |
|---|---|---|
| G1 — Làm rõ hệ thống làm được gì | Đầu trang: “AI gợi ý… Bạn luôn là người quyết định”; thanh `#capabilities` ghi rõ mock, chưa kết nối Discord | Mở trang, đọc phạm vi trước khi tạo lượt (CP2-01) |
| G2 — Làm rõ nó làm tốt đến đâu | Thanh giới hạn ở đầu trang; nhãn tin cậy trong danh sách và chi tiết, ghi rõ tình huống giả lập, không phải xác suất đã đo | So sánh kịch bản 01 và 02 (CP2-01/02) |
| G8 — Gạt bỏ dễ dàng | Ô “Quyết định của TA” có “Bỏ khỏi đề xuất”; không cần chạy lại AI, vẫn giữ lịch sử và có thể mở lại | Bỏ đề xuất kèm lý do, chốt rồi quay lại (CP2-07) |
| G9 — Sửa dễ dàng | Form dưới tin nguồn: sửa trạng thái/ghi chú trực tiếp; nút “Mở lại để duyệt” và “Quay lại chỉnh sửa” ở kết quả | Đổi nhận định sai thành đã giải quyết, lưu và chốt lại (CP2-04/07) |
| G10 — Thu hẹp phạm vi khi nghi ngờ | Kịch bản 02: khung vàng yêu cầu ngữ cảnh, mặc định “Cần kiểm tra thêm”; kịch bản 03: loại nguồn sai và không cho chốt | Thiếu lý do thì chặn lưu; thiếu căn cứ thì không có kết quả bịa (CP2-02/03) |
| G11 — Giải thích vì sao | Khối “AI đề xuất” và lý do; nút “Mở … tin nguồn” mở nội dung, mã, thời gian và người viết giả lập ngay trong chi tiết | Đối chiếu DEMO-M03 với đề xuất theo dõi, DEMO-M06 với correction (CP2-01/04) |

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

Các kịch bản chọn trực tiếp trong ô “Kịch bản thử nghiệm”; thao tác chi tiết trong [codebase/README.md](codebase/README.md). Tất cả nhánh AI là giả lập CP2; chốt/tải kết quả là chức năng thật trong trình duyệt.

| Đường đi | Đầu vào / điểm rẽ | Giao diện và thao tác TA | Điểm kết thúc / khôi phục |
|---|---|---|---|
| **Happy path** | Kịch bản 01; nguồn rõ, mức chắc chắn cao giả lập | Xem 3 hội thoại → mở nguồn từng mục → giữ hoặc sửa đề xuất → lưu | Duyệt 3/3 → chốt 2 mục theo dõi và 1 đã giải quyết → tải JSON |
| **Low-confidence** | Kịch bản 02; câu “vẫn như lúc nãy”, thiếu ảnh/ngữ cảnh | Hiện giới hạn; TA mở nguồn, chọn cần kiểm tra thêm, ghi câu hỏi tiếp theo. Không cho lưu thiếu lý do | Chốt mục “Cần kiểm tra thêm”; hoặc bỏ kèm lý do, không ép kết luận đã giải quyết |
| **Failure / no-grounding** | Kịch bản 03 có mã DEMO-MISSING không hợp lệ; kịch bản 05 mô phỏng timeout | Loại đề xuất/báo lỗi; không cho chốt như thành công. Có “Kiểm tra dữ liệu đầu vào” và nút thử lại | Xem giới hạn nguồn; đổi phạm vi; hoặc thử lại chuyển rõ sang happy giả lập, giữ server/ngày |
| **Correction** | Kịch bản 04 cố ý đề xuất theo dõi dù DEMO-M06 đã xác nhận mở được tài liệu | TA mở nguồn → đổi thành đã giải quyết → nhập lý do → lưu; có thể mở lại hoặc bỏ đề xuất | Chốt danh sách 0 mục; JSON giữ đề xuất AI cũ + quyết định TA + lý do + lịch sử. Quay lại sửa được |

**Nhánh bổ sung:** kịch bản 06 không có hội thoại, cho đổi phạm vi hoặc chốt rỗng và ghi rõ không đủ dữ liệu để kết luận toàn server đã ổn. Không đồng nhất nhánh rỗng hợp lệ với lỗi/no-grounding. Chưa mở nguồn thì không bật quyết định; chưa duyệt hết thì không bật chốt. Mọi thay đổi sau khi chốt đều yêu cầu chốt lại.

**Kiểm chứng:** xem [nhật ký kỹ thuật](codebase/verification.md); không coi kiểm thử nội bộ là buổi dùng thử với người ngoài nhóm hoặc bằng chứng AI hoạt động thật.

## §7. Khám phá, Kiểm thử và Quality Bar — CP4

**Bộ kiểm thử CP3 (golden set 20 case):**
- 5 hard case (TA rà soát độc lập) + 5 ambiguous + 10 standard; phân bố tại [eval/golden_set.json](eval/golden_set.json).
- Kết quả chạy model thật (`nvidia/nemotron-3-ultra-550b-a55b:free` qua OpenRouter) lưu tại [eval/golden_set_results.json](eval/golden_set_results.json):
  - Accuracy: 7/20 (35.0%) trên bộ 20 case đầy đủ
  - Recall với case `no-response`: 4/5 (80.0%)
  - Trích dẫn hợp lệ: 100% (tất cả 20 case đều map đúng msg_id từ pack thật)
  - Avg API time: ~15.95s/case (nguyên nhân do model 550B free tier queue)

**Quality Bar CP4 — ĐÃ CHỐT:**

| Chỉ số | Ngưỡng tối thiểu | Lý do |
|---|---|---|
| Overall accuracy (20 case) | >= 70% | Đủ để TA tin vào đề xuất làm điểm xuất phát (cần tune prompt hoặc model nhanh hơn) |
| Recall (no-response) | >= 90% | Không bỏ sót người đang cần giúp là ưu tiên sống còn của TA |
| Trích dẫn hợp lệ | >= 95% | Mọi đề xuất phải có căn cứ tin nhắn gốc đọc được, không bịa mã tin |
| Avg API time | <= 5s / case | Toàn bộ lượt rà soát 5 case trong <=25s là chấp nhận được trong trải nghiệm thực |
| Thời gian TA hoàn thành | <= 5 phút | Đo bằng session timer trong mock; xác nhận với TA thật ở CP5 |

**Kế hoạch CP5:**
- Chạy lại analyze.py khi cần tune prompt để đạt quality bar; lưu kết quả so sánh.
- Tổ chức >=5 phiên dùng thử với người ngoài nhóm; ghi nhật ký chi tiết tại [validation/user_testing.md](validation/user_testing.md).
- Đo thời gian thật từ khi mở mock/index.html đến khi chốt danh sách; ghi nhận tỷ lệ TA tự sửa và hiểu nhãn.

## §8. Phân công & kế hoạch

Phân công và willing users ở §2, ô 4; thông tin thành viên lấy từ [TEAMMATES.md](TEAMMATES.md).

| Mốc | Việc cần hoàn thành | Trạng thái |
|---|---|---|
| CP1 — 19:30 16/09 | Canvas, evidence ban đầu, hai willing users, repo công khai | Hoàn thành |
| CP2 — 21:00 16/09 | Bản mẫu Mock, sơ đồ luồng, HAX table, 7/7 test pass | Hoàn thành |
| CP3 — 16:00 17/09 | AI thật qua OpenRouter, giao diện 4 bước, golden set 20 case | Hoàn thành |
| CP4 — 21:00 17/09 | Impact table, nghiên cứu tương tự, chốt quality bar, reflection | Hoàn thành |
| CP5 — 13:00 18/09 | >=5 người ngoài nhóm dùng thử, nhật ký kết quả, slide PDF và video 30 giây | Đang thực hiện |

## §9. Changelog

| Ngày | Đổi gì | Căn cứ |
|---|---|---|
| 16/09/2026 | Canvas B2 kết hợp tổng quan, hội thoại cần theo dõi, dấu hiệu cần hỗ trợ | Hướng nhóm chọn; mẫu 50 tin và bốn bản tin nền |
| 16/09/2026 | Phân biệt có phản hồi với đã giải quyết; giữ trạng thái thiếu ngữ cảnh | M05023/M13539 và M04968/M73803 |
| 16/09/2026 | Bổ sung Đỗ Đức Đại và Phạm Cường Quốc vào willing users | Nhóm cung cấp; chưa có feedback dùng thử |
| 16/09/2026 | Phân vai dùng thử: Đỗ Đức Đại rà soát cuối ngày; Phạm Cường Quốc kiểm chứng kết quả | Nhóm chốt nhiệm vụ đóng vai TA; chưa có phiên dùng thử |
| 16/09/2026 | Bổ sung CP2: bản mẫu Mock, sơ đồ đầy đủ, 4 nhánh trải nghiệm và 6 nguyên tắc HAX ở §4/§6 | Yêu cầu CP2; dữ liệu tự tạo, TA giữ quyền quyết định, AI thật để CP3 |
| 17/09/2026 | CP3: giao diện 4 bước (`codebase/mock/`), AI thật qua OpenRouter nvidia/nemotron, golden set 20 case | Yêu cầu CP3; analyze.py gọi API thật; eval/ lưu kết quả |
| 17/09/2026 | CP4: nghiên cứu tương tự (§3), chốt quality bar (§7), reflection, slide CP5, validation doc | Yêu cầu CP4; dựa trên kết quả eval CP3 và kế hoạch CP5 |
| 17/09/2026 | Fix analyze.py: đường dẫn data linh hoạt, bộ xử lý UTF-8, strip markdown code block | Chạy kiểm thử 20 case thành công |
