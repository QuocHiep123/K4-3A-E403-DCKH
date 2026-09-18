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
4. Chọn model ở mục **Mô hình OpenRouter** trên đầu trang, rồi bấm **Tìm hội thoại cần giúp** trong bước 2. Mỗi lượt phân tích tối đa 6 hội thoại. Màn hình cập nhật tiến độ; có thể dừng sau lượt hiện tại, tiếp tục phần chưa chạy hoặc thử lại lỗi.
5. AI đề xuất tối đa 5 mục dựa trên priority 1–3; cùng mức thì hội thoại cũ hơn trước, sau đó mã tin để ổn định thứ tự. `resolved` và `other` bị loại khỏi đề xuất. Danh sách chỉ là tạm thời nếu còn case chưa chạy/lỗi/vượt giới hạn.
6. Chọn từng mục, đọc tin nguồn, kiểm tra lý do và mã trích dẫn. Đánh dấu đã đọc, giữ hoặc sửa trạng thái, thêm lý do/bước tiếp theo rồi **Lưu quyết định**.
7. Tab **Tất cả** cho xem cả những mục không được AI chọn. Có thể bỏ một mục khỏi danh sách cuối và thay bằng mục khác. Không cho chốt quá 5 mục.
8. **Tải kết quả JSON** giữ nguồn dữ liệu, phạm vi, số case đã phân tích/duyệt, mã nguồn, kết quả AI, quyết định TA và lịch sử sửa. Không xuất nguyên pack; không gửi Discord.

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

Batch lỗi không tạo kết quả giả. Thiếu key, phiên dữ liệu hết hạn hoặc lỗi dịch vụ làm dừng các batch tiếp theo để người dùng xử lý; các kết quả đã nhận vẫn giữ. Free tier có thể chậm: toàn bộ server/ngày có thể cần nhiều phút, không phải một lời gọi tức thì.

AI phân loại cả `other` để loại thông báo/trò chuyện không cần hỗ trợ; điều này thuộc workflow mới, không tự sửa nhãn hoặc số liệu golden set cũ. **Xem lượt kiểm thử đã lưu** vẫn đọc tệp cũ, không phải kết quả đánh giá workflow mới. Slide PDF và nhật ký R6 chưa được cập nhật trong thay đổi này.

## Lưu dữ liệu

- Upload và preview ở RAM server, tối đa 12 bộ dữ liệu / 24 preview, hết hạn sau 4 giờ hoặc khi restart. Không ghi file upload vào repo.
- Kết quả AI/TA ở localStorage, tách theo hash dữ liệu, nguồn, bộ lọc và model. Đổi model cần phân tích lại toàn phạm vi cho model mới; quay lại model cũ sẽ khôi phục kết quả và quyết định riêng của nó. Không đổi model khi đang chạy; dừng sau lượt hiện tại trước. Thời gian hiển thị là thời gian cả batch, không phải mỗi hội thoại hay benchmark chất lượng. Sau reload/restart, nhập lại cùng dữ liệu và bộ lọc để khôi phục quyết định. Nội dung CSV/paste không tự lưu thành file trong trình duyệt.
- localStorage riêng theo browser/host/cổng; xóa dữ liệu trình duyệt sẽ mất bản lưu. Không đồng bộ nhiều TA.
- Server chỉ bind localhost; tệp `.env`, thư mục dữ liệu và listing bị chặn qua static HTTP.

## API

- `GET /api/config`: model mặc định và danh sách lựa chọn gợi ý (không bảo đảm quyền truy cập của tài khoản).
- `GET /api/template`: CSV mẫu tự tạo.
- `POST /api/import`: `{source: "bundled"}` hoặc `{source: "csv", text, name}` hoặc `{source: "paste", text}`; trả dataset ID và các bộ lọc.
- `POST /api/preview`: `{dataset_id, guild, day, channel}`; trả review ID, nguồn từng hội thoại, fingerprint và batch IDs.
- `POST /api/analyze`: `{review_id, ids, model}`; `model` là ID OpenRouter, nếu bỏ qua dùng mặc định server. Server lấy chính nội dung preview đã giữ, không nhận nội dung thay thế từ client.
- `GET /api/eval`: lượt kiểm thử lịch sử. `/api/cases` và `/api/classify` giữ tương thích với demo năm case trước; UI hiện tại không dùng hai endpoint này.

## Kiểm tra

```sh
python -m unittest discover -s codebase -p '*_test.py' -v
node --test codebase/model.test.js codebase/review-model.test.js
node --check codebase/dashboard.js
```

Test browser tùy chọn, profile tạm và AI được intercept (import/preview dùng backend thật):

```sh
node codebase/dashboard.browser.test.cjs /path/to/playwright /path/to/browser http://127.0.0.1:8082
```

Kiểm tra CSV mới, pasted input, pack thật, date cutoff, reply thiếu/mã trùng, citations, partial failure/retry, ranking, cap 5, correction/export, khôi phục dữ liệu, đổi model/cách ly quyết định theo model, lỗi credits/ID model và mobile 390px. Đây là kiểm chứng kỹ thuật, không phải quality benchmark hoặc dùng thử R6.
