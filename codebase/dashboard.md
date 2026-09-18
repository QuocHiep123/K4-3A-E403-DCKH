# Discord Pulse — demo với dữ liệu mới

## Chạy

Từ gốc repo:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python server.py
```

Mở http://localhost:8080. Dừng server cũ bằng Ctrl+C và chạy lại sau khi cập nhật Python. Có thể chọn cổng khác: `PORT=8082 python server.py`.

Tạo `.env` ở gốc repo (không commit):

```dotenv
OPENROUTER_API_KEY=your_key_here
# OPENROUTER_MODEL=provider/model-id
```

Model mặc định vẫn theo `OPENROUTER_MODEL` (Nemotron nếu chưa đặt); quyền truy cập/hạn mức phụ thuộc tài khoản. Ở mục **Mô hình OpenRouter** trên đầu trang, chọn **Gemini 3.8 Flash**, **Gemini 2.5 Flash**, **Nemotron** hoặc **Model khác…**; lựa chọn được áp dụng ngay. Model khác cần ID OpenRouter dạng `provider/model-id`; nhấn Enter hoặc rời ô nhập để áp dụng. Gemini dùng credits trả phí; thiếu credits/model không khả dụng được báo lỗi, không tự đổi model. Lựa chọn được nhớ trong trình duyệt, không sửa `.env`. Đọc và xem trước dữ liệu không gọi AI. Chỉ bấm phân tích mới gửi các hội thoại trong phạm vi đang chọn đến OpenRouter. Không tự gửi tin lên Discord.

## Kịch bản demo cho giám khảo

1. Chọn **Dữ liệu khoá học**, **Tải CSV của bạn** hoặc **Dán hội thoại**.
2. Với CSV, dùng **Tải CSV mẫu** để lấy định dạng. Dữ liệu được kiểm tra trước khi gọi AI. Với nội dung dán, dùng một dòng `---` để tách nhiều hội thoại độc lập.
3. Chọn server, ngày và kênh. Xem số hội thoại, số tin và số lượt AI; đọc vài tin nguồn. Có thể chọn một kênh nhỏ để demo nhanh.
4. Chọn model ở mục **Mô hình OpenRouter** trên đầu trang, rồi bấm **Tìm hội thoại cần giúp** trong bước 2. Mỗi lượt phân tích tối đa 6 hội thoại. Model trả phí chạy tối đa 3 lượt đồng thời; ID kết thúc `:free` và `openrouter/free` vẫn chạy tuần tự. Màn hình cập nhật tiến độ; có thể bấm **Dừng phân tích** để mở khóa giao diện ngay, tiếp tục phần chưa chạy hoặc thử lại lỗi.
5. AI đề xuất tối đa 5 mục dựa trên priority 1–3; cùng mức thì hội thoại cũ hơn trước, sau đó mã tin để ổn định thứ tự. `resolved` và `other` bị loại khỏi đề xuất. Danh sách chỉ là tạm thời nếu còn case chưa chạy/lỗi/vượt giới hạn.
6. Chọn từng mục, đọc tin nguồn, kiểm tra lý do và mã trích dẫn. Đánh dấu đã đọc, giữ hoặc sửa trạng thái, thêm lý do/bước tiếp theo rồi **Lưu quyết định**. Hội thoại đã có kết quả có thể được duyệt ngay khi các lượt khác còn chạy, kể cả sau khi bấm **Tiếp tục phân tích**. Mục chưa có kết quả chưa cho chốt quyết định.
7. Tab **Tất cả** cho xem cả những mục không được AI chọn. Có thể bỏ một mục khỏi danh sách cuối và thay bằng mục khác. Không cho chốt quá 5 mục.
8. **Tải kết quả JSON** giữ nguồn dữ liệu, phạm vi, số case đã phân tích/duyệt, mã nguồn, kết quả AI, quyết định TA và lịch sử sửa. Không xuất nguyên pack; không gửi Discord.

Các lượt trả về sau không đổi hội thoại đang xem, bỏ dấu đã đọc hoặc xóa ghi chú đang nhập. Bản nháp của từng hội thoại được giữ khi chuyển qua lại trong tab hiện tại; đổi dữ liệu, phạm vi, model hoặc tải lại trang sẽ xóa bản nháp chưa lưu. Dùng **Lưu quyết định** để giữ bản chính thức trong trình duyệt.

Giám khảo có thể thử câu hỏi mới, một trao đổi đã xác nhận giải quyết, lời hỏi chẩn đoán chưa giải quyết, tin thiếu ngữ cảnh và chỉ dẫn giả trong nội dung hội thoại. Model vẫn có thể sai; TA giữ quyền quyết định.

## CSV

- UTF-8, có thể có BOM, tối đa 2 MB và 3.000 dòng tin nhắn.
- Cột bắt buộc: `msg_id` (duy nhất), `content` (không rỗng).
- Cột tùy chọn: `reply_to`, `created_at_vn`, `guild`, `channel`, `author`, `is_bot`, `n_attachments`. Các cột khác được bỏ qua.
- Thời gian: `YYYY-MM-DD HH:MM[:SS]`, giờ Việt Nam, không kèm timezone. Thiếu thời gian vẫn tải được; tin không rõ thời gian bị loại khi lọc ngày.
- `is_bot`: True/False hoặc 1/0. `n_attachments`: số nguyên không âm.
- Nội dung chứa dấu phẩy hoặc xuống dòng cần đặt trong dấu ngoặc kép theo chuẩn CSV. Lỗi chỉ rõ dòng/cột cần sửa; không tự thay bằng dữ liệu mẫu.

## Dữ liệu thật và ngữ cảnh

`data/discord-pack/k4_messages.csv` được đọc tại chỗ; không copy vào source hoặc commit pack. Bộ hiện tại có 1.092 tin, gồm 779 tin do người viết. Có ba mã tin bị trùng trong pack: importer dành cho pack thêm hậu tố nguồn `#1`, `#2` và giữ mã gốc. CSV tự tải lên cần ID duy nhất.

- Gom theo các liên kết reply rõ ràng trong cùng server/kênh. Tin cha mơ hồ, vắng mặt, ở tương lai hoặc khác kênh được ghi cảnh báo, không đoán liên kết.
- Ngày rà soát nghĩa là các hội thoại có hoạt động trong ngày đó. Nạp thêm các tin trước đó trong chuỗi reply, nhưng không dùng tin sau cuối ngày.
- Nhóm chỉ có bot không đưa vào danh sách; reply của bot trong hội thoại có người được giữ làm ngữ cảnh.
- Hiển thị nội dung gốc, ID, thời gian, dấu hiệu tệp đính kèm và tác giả ký hiệu trong từng hội thoại; không suy ra người nào là TA.
- Không thấy reply trực tiếp không chứng minh chưa có câu trả lời ở nơi khác. Ảnh/tệp không có trong pack được báo thiếu.
- Hội thoại trên 16.000 ký tự hoặc 80 tin vẫn xem được nhưng không tự gửi AI; cần chia nhỏ. Không cắt ngầm nội dung. Mỗi batch tối đa 6 hội thoại và khoảng 24.000 ký tự JSON (một hội thoại dài có thể đứng riêng).

## Phân tích và giới hạn

`codebase/triage.py` gọi model thật với nội dung và cảnh báo của từng hội thoại. Model trả nhãn, priority, confidence tự báo, lý do, và 1–3 mã căn cứ. Server kiểm tra cấu trúc, đủ case, không lặp ID và mã căn cứ phải thuộc chính hội thoại đó. Kiểm tra ID không chứng minh model diễn giải đúng; TA vẫn cần đọc nguồn.

Batch lỗi không tạo kết quả giả. Thiếu key, phiên dữ liệu hết hạn hoặc lỗi dịch vụ làm dừng các batch tiếp theo để người dùng xử lý; các kết quả đã nhận vẫn giữ. Khi lỗi dịch vụ, không gửi thêm lượt mới và vẫn lưu kết quả các lượt đã gửi. Khi người dùng bấm Dừng, trình duyệt hủy chờ ngay, giữ kết quả đã nhận và không nhận kết quả đến muộn. Yêu cầu đã gửi có thể vẫn hoàn tất/tính phí ở provider; server tiếp tục ghi log. Tiếp tục sẽ gọi lại những mục chưa có kết quả. Free tier có thể chậm: toàn bộ server/ngày có thể cần nhiều phút, không phải một lời gọi tức thì.

AI phân loại cả `other` để loại thông báo/trò chuyện không cần hỗ trợ; điều này thuộc workflow mới, không tự sửa nhãn hoặc số liệu golden set cũ. **Xem lượt kiểm thử đã lưu** đọc kết quả pipeline mới tại `eval/local/current_run.json` nếu có; chỉ dùng tệp lịch sử khi chưa có lượt mới. Pipeline dùng cùng input/classifier với dashboard, yêu cầu nhãn đã rà soát để tính accuracy/recall; xem [hướng dẫn đánh giá](../eval/README.md). Slide PDF đã phản ánh giới hạn đánh giá; nhật ký R6 vẫn là các phiên prototype trước.

## Lưu dữ liệu

- Upload và preview ở RAM server, tối đa 12 bộ dữ liệu / 24 preview, hết hạn sau 4 giờ hoặc khi restart. Không ghi file upload vào repo.
- Kết quả AI/TA ở localStorage, tách theo hash dữ liệu, nguồn, bộ lọc và model. Đổi model cần phân tích lại toàn phạm vi cho model mới; quay lại model cũ sẽ khôi phục kết quả và quyết định riêng của nó. Không đổi model khi đang chạy; bấm Dừng phân tích trước. Thời gian trong mỗi kết quả là thời gian cả batch, không phải mỗi hội thoại hay benchmark chất lượng. Thanh tiến độ hiển thị số lượt đang chạy và tổng thời gian thực tế; chạy đồng thời giảm tổng thời gian, không bảo đảm giảm độ trễ của từng batch. Sau reload/restart, nhập lại cùng dữ liệu và bộ lọc để khôi phục quyết định. Nội dung CSV/paste không tự lưu thành file trong trình duyệt.
- localStorage riêng theo browser/host/cổng; xóa dữ liệu trình duyệt sẽ mất bản lưu. Không đồng bộ nhiều TA.
- Server chỉ bind localhost; tệp `.env`, thư mục dữ liệu và listing bị chặn qua static HTTP.

## API

- `GET /api/config`: model mặc định và danh sách lựa chọn gợi ý (không bảo đảm quyền truy cập của tài khoản).
- `GET /api/template`: CSV mẫu tự tạo.
- `POST /api/import`: `{source: "bundled"}` hoặc `{source: "csv", text, name}` hoặc `{source: "paste", text}`; trả dataset ID và các bộ lọc.
- `POST /api/preview`: `{dataset_id, guild, day, channel}`; trả review ID, nguồn từng hội thoại, fingerprint và batch IDs.
- `POST /api/groups`: `{review_id, ids, model}`; lấy nguồn từ preview, đề xuất nhóm câu hỏi chung. Tối đa 80 hội thoại / 60.000 ký tự nguồn; không cắt ngầm hoặc chia nhóm theo từng batch phân loại.
- `POST /api/analyze`: `{review_id, ids, model}`; `model` là ID OpenRouter, nếu bỏ qua dùng mặc định server. Server lấy chính nội dung preview đã giữ, không nhận nội dung thay thế từ client.
- `GET /api/eval`: lượt kiểm thử lịch sử. `/api/cases` và `/api/classify` giữ tương thích với demo năm case trước; UI hiện tại không dùng hai endpoint này.

## Kiểm tra

```sh
python -m unittest discover -s codebase -p '*_test.py' -v
node --test codebase/model.test.js codebase/review-model.test.js codebase/group-model.test.js
node --check codebase/dashboard.js
```

Test browser tùy chọn, profile tạm và AI được intercept (import/preview dùng backend thật):

```sh
node codebase/dashboard.browser.test.cjs /path/to/playwright /path/to/browser http://127.0.0.1:8082
node codebase/concurrent-review.browser.test.cjs /path/to/playwright /path/to/browser http://127.0.0.1:8082
```

Kiểm tra CSV mới, pasted input, pack thật, date cutoff, reply thiếu/mã trùng, citations, partial failure/retry, chạy đồng thời/đảo thứ tự kết quả/dừng khi rate limit, ranking, cap 5, correction/export, khôi phục dữ liệu, đổi model/cách ly quyết định theo model, lỗi credits/ID model và mobile 390px. Đây là kiểm chứng kỹ thuật, không phải quality benchmark hoặc dùng thử R6.

## Log prompt và thời gian LLM

Mỗi batch ghi hai dòng JSON vào `logs/llm-requests.log`: `request` (ghi trước khi gọi provider) và `completion`, nối bằng `trace_id`. File được tạo ở lần gọi đầu tiên sau khi khởi động server mới. Nhật ký trên dashboard và JSON xuất có trace ID cho kết quả/lỗi đã nhận.

- `request`: model, đầy đủ system/user prompt và tham số đúng như yêu cầu gửi đi.
- `completion`: HTTP status, response body (kể cả nội dung lỗi/JSON sai), provider request ID, usage/token counts nếu provider có trả, kết quả validation.
- `timing.upstream_seconds`: thời gian gọi OpenRouter cho đến khi nhận xong body hoặc lỗi/timeout. Bao gồm mạng, routing, chờ và sinh câu trả lời; không tách được thời gian queue nội bộ của provider.
- `timing.local_processing_seconds`: thời gian xử lý/validation cục bộ còn lại; `total_seconds` là tổng hai phần, không gồm ghi file trace.
- Không ghi Authorization header hoặc API key; nếu provider echo đúng API key thì được thay bằng `[REDACTED]`. Log chứa nội dung hội thoại được gửi. Thư mục `/logs/` bị Git bỏ qua và không được phục vụ qua HTTP. Log không tự xóa/xoay vòng; có thể xóa file cục bộ khi không cần giữ.

Xem trực tiếp từ gốc repo:

```sh
tail -f logs/llm-requests.log
```

Chỉ có dòng `request` nghĩa là lời gọi còn đang chạy hoặc server đã dừng trước khi ghi completion. Không đủ kết luận provider bị lỗi. Phần lớn thời gian nằm ở `upstream_seconds` nghĩa là nút thắt nằm trong lời gọi OpenRouter/mạng/provider, không phải xử lý giao diện.

## Nhóm câu hỏi chung chưa trả lời

Sau phân tích, mở **Câu hỏi chung chưa trả lời** và bấm **Đề xuất nhóm câu hỏi**. Đây là một lời gọi AI riêng cho toàn bộ danh sách ứng viên trong phạm vi, không thêm lời gọi cho từng hội thoại hay từng cặp. Chỉ các mục có kết quả hợp lệ với nhãn hiệu lực `no-response` được chọn (quyết định TA ưu tiên hơn nhãn AI). Không lấy riêng top 5.

Model được yêu cầu tìm những câu hỏi có thể dùng nguyên một câu trả lời chung: cùng lớp, bài tập, buổi học/ngày, tài liệu/phiên bản. Lỗi tài khoản/quyền truy cập, hoàn cảnh cá nhân, bài làm riêng, câu hỏi mơ hồ hoặc thiếu tệp/ngữ cảnh phải giữ riêng. Model đọc lại toàn bộ nguồn để loại các mục đã có câu trả lời. Đây vẫn là gợi ý cần TA kiểm tra; kiểm tra ID không chứng minh nhóm đúng ngữ nghĩa.

1. Mở **Xem nguồn** của từng thành viên định giữ; nhóm hiển thị toàn bộ tin của hội thoại, thời gian, kênh, cảnh báo và căn cứ AI.
2. Bỏ chọn câu hỏi không phù hợp hoặc **Bỏ nhóm**. Cần ít nhất 2 thành viên để xác nhận.
3. Đánh dấu xác nhận cùng câu hỏi, cùng đối tượng, một câu trả lời áp dụng cho tất cả rồi bấm **Xác nhận nhóm**. Thay đổi thành viên hoặc khôi phục nhóm đã bỏ yêu cầu xác nhận lại.
4. TA nhập câu trả lời chung dựa trên thông tin đã kiểm chứng. AI không bịa deadline/link hay tự viết câu trả lời khi thiếu dữ kiện. **Sao chép câu trả lời** và **Tải bản nháp nhóm** không gửi Discord, không tự đánh dấu đã trả lời/giải quyết, và không thay đổi danh sách tối đa 5 hội thoại.

Nhóm và bản nháp được lưu riêng theo fingerprint dữ liệu/phạm vi, model và danh sách ứng viên chưa trả lời. Khi đổi nhãn TA hoặc phân tích thêm làm thay đổi ứng viên, giao diện chuyển sang bộ nhóm tương ứng; bản nháp cũ vẫn ở khóa lưu trước đó. Reload rồi nhập lại cùng dữ liệu/bộ lọc sẽ khôi phục bản lưu. Nút **Đề xuất lại (thay bản nháp)** thay nhóm/bản nháp sau khi nhận kết quả hợp lệ; lỗi hoặc Stop giữ bản đã lưu.

Giới hạn: tối đa 80 hội thoại / 60.000 ký tự nguồn trong một lời gọi; vượt giới hạn cần lọc ngày/kênh nhỏ hơn. Mỗi nhóm tối đa 20 thành viên, tối đa 20 nhóm. AI có thể bỏ sót nhóm; mục không được gom vẫn ở danh sách hội thoại. Hiển thị số ứng viên và độ bao phủ phân tích để không coi kết quả một phần là toàn bộ dữ liệu.

Log có `task: "question_groups"` cùng trace ID, prompt, response và thời gian như phân loại. JSON nhóm giữ cả đề xuất gốc, thành viên TA giữ lại, bản nháp, xác nhận và lịch sử đổi thành viên.

Kiểm tra browser bổ sung (AI giả lập, API nhập/xem trước thật):

```sh
node codebase/groups.browser.test.cjs /path/to/playwright /path/to/browser http://127.0.0.1:8084
```
