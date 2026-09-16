# Nhật ký bằng chứng CP1 — Discord Pulse

**Ngày:** 16/09/2026 · **Nhóm:** DCKH · **Track:** B2
**Trạng thái:** mining ban đầu; chưa khảo sát/dùng thử. AI hỗ trợ đọc mẫu và gán nhãn; nhóm cần rà soát, ưu tiên TA chấm độc lập trước CP4.

## Câu hỏi khai phá

1. Trong mẫu tin người viết, bao nhiêu tin là câu hỏi/yêu cầu hỗ trợ?
2. Có thể đồng nhất “có phản hồi” với “đã giải quyết” không?
3. Bản tin hiện tại mô tả trạng thái chưa rõ như thế nào?
4. Dữ liệu có đủ kết luận một câu hỏi bị bỏ quên sau 4 giờ không?

## Dữ liệu và phương pháp tái lập

- Nguồn cục bộ: `data/discord-pack/k4_messages.csv` và `k4_daily_reports.md`; đã đọc dictionary. Không sao chép pack vào repo công khai.
- Đếm số dòng bằng CSV parser, tách `is_bot`. Một dòng là một tin; `author` là mã người viết, không phân biệt học viên/TA.
- **Đọc mẫu trước khi chốt cách đếm:** lọc 779 tin không phải bot, sắp theo `(created_at_vn, msg_id)`, lấy 50 vị trí `floor(i × (779−1)/49)` với `i=0…49`. Đây là mẫu cách đều theo thời gian, không phải mẫu ngẫu nhiên; không bảo đảm đại diện từng kênh/lớp.
- Gán ba nhãn bằng đọc nội dung: `support_request` = câu hỏi/yêu cầu thông tin hoặc báo cần hỗ trợ rõ; `needs_context` = không đủ ngữ cảnh; `other` = hướng dẫn/thông báo/phản ứng/nội dung khác. Lưu đủ 50 mã và nhãn trong [sample-annotations.json](sample-annotations.json), không chép nội dung dài.
- Đọc thêm tin gốc và reply của M53930, M84013, M27034, M05023, M04968, M92861, M86664, M76725. Đây là kiểm tra định tính có chủ đích; không cộng các tin bổ sung vào mẫu 50.
- Chỉ số cấu trúc 4 giờ: chỉ xét yêu cầu của mẫu có `t + 4 giờ` không vượt quá tin cuối quan sát được của cùng server. Tìm reply từ tác giả khác hoặc bot, `reply_to` đúng mã, timestamp từ `t` đến `t + 4 giờ`. Reply của chính người hỏi không tính là phản hồi từ người khác.
- Bản tin: chia theo bốn tiêu đề cấp 2; đếm số bản tin chứa chuỗi và số lần xuất hiện chính xác của nhãn kết quả chưa rõ. Không coi số nhãn là số vấn đề duy nhất.

Chạy từ thư mục gốc bằng Python 3; không cần thư viện ngoài hoặc API:

```sh
python3 evidence/analyze_discord.py
```

Nếu pack nằm ngoài repo:

```sh
python3 evidence/analyze_discord.py --pack /duong/dan/discord-pack
```

Kết quả: [metrics.json](metrics.json), kèm SHA-256 của hai file nguồn. Script kiểm tra đủ 50 mã trùng với mẫu đã đọc; chỉ tái tính nhãn đã gán, không tự chứng minh nhãn đúng.

## Số liệu quan sát được

| Chỉ số | Kết quả |
|---|---|
| Tin trong pack | 1.092 = 779 người viết + 313 bot viết |
| Mã tác giả người | 201; không coi là 201 học viên hoặc người xác nhận pain |
| Số tin ngày 12/09, 13/09, 14/09 | 288 / 348 / 456 |
| `msg_type=reply` / có `reply_to` | 519 / 508; không phải mọi reply đều có mã gốc trong pack |
| Mẫu người viết | 50 tin: 28 yêu cầu (56%), 6 cần ngữ cảnh, 16 khác |
| Yêu cầu mẫu có đủ khoảng quan sát 4 giờ theo server | 23/28 |
| Không thấy reply trực tiếp từ người khác/bot trong 4 giờ | 3/23 (13,0%): M49586, M67785, M48859 |
| Bản tin có nhãn “Đã có phản hồi, chưa xác nhận đã xử lý” | 2/4 bản tin, tổng cộng 7 lần |
| Bản tin chứa lỗi chèn “nguồn tham chiếu” | 1/4 bản tin |

**Không diễn giải 3/23 thành tỷ lệ bị bỏ sót.** Đây là phép đếm reply trực tiếp trong mẫu. Câu trả lời có thể ở tin thường, thread khác hoặc ngoài pack; câu hỏi cũng có thể không cần TA trả lời. Đây là bằng chứng chống lại quy tắc đơn giản “không có reply = bị bỏ quên”.

Mốc cuối theo server khác nhau: K4-L2-3 dừng ở **13/09 23:39**, K4-L3-4 dừng ở **14/09 23:54**. M53930 và M84013 chưa đủ khoảng quan sát 4 giờ trong server của mình; M04968 cũng chưa đủ 4 giờ. Không gắn nhãn quá hạn cho ba ví dụ này. Mốc tin cuối không bảo đảm kênh được thu thập liên tục/đầy đủ.

## Sáu ví dụ nguyên văn và giới hạn kết luận

Mỗi ví dụ tối đa hai câu. Các đoạn trích là chuỗi nguyên văn trong tin nguồn; nhận xét là phân tích, không phải lời người dùng. Không đính kèm tên thật/mã tác giả học viên.

| Mã nguồn | Trích dẫn nguyên văn ngắn | Quan sát và giới hạn |
|---|---|---|
| M53930 | “Hiện tại em vẫn chưa vào được phoenix ạ” | Báo vẫn chưa truy cập được; chưa biết nguyên nhân/kết quả về sau, chưa đủ 4 giờ quan sát |
| M84013 | “ad ơi trường hợp của em thì nên xử lý thế nào ạ” | Reply tiếp tục yêu cầu hướng xử lý; không đủ căn cứ nói bị TA bỏ quên |
| M05023 | “cho mình hỏi tại sao truy cập lại thấy trống nhỉ và làm sao tìm repo để setup AI log được nhỉ” | M13539 phản hồi sau một phút, hỏi chẩn đoán về email; chưa xác nhận thành công |
| M04968 | “xin hỗ trợ xác nhận cộng điểm trên lớp ở đâu ạ. Vlearn đóng lớp không tạo yêu cầu được” | Bot M73803 hỏi làm rõ cùng phút; không đánh dấu đã giải quyết chỉ vì có reply |
| M65121 | “nộp theo nhóm một người nộp cho cả nhóm hay là mỗi cá nhân đều phải nôp” | Hữu ích để gom chủ đề quy cách nộp; chưa được xác nhận là còn tồn |
| M27034 | “e đăng nhập vào zoom để tối nay workshop mà cứ báo như này thì tối e đăng nhập bằng mail cá nhân rồi đổi tên theo quy định được không ạ?” | M66739 hướng dẫn sau năm phút; phản ví dụ tránh đưa mọi báo lỗi vào nhóm chưa được trả lời. Không có nội dung ảnh đính kèm |

## Kết luận phục vụ Canvas

- Có cơ sở thiết kế bản tin nối **chủ đề → hội thoại → trạng thái và nguồn**; phân biệt trả lời, hỏi làm rõ và bằng chứng giải quyết.
- Chọn **TA duyệt danh sách cần theo dõi** làm quyết định trung tâm. Tổng quan và dấu hiệu còn vướng hỗ trợ quyết định này.
- Chưa chứng minh thời gian TA mất, số TA ảnh hưởng, tỷ lệ câu thực sự bị bỏ sót, độ chính xác AI hoặc mức tiết kiệm. Không biến số mô tả thành impact đã đo.
- Bốn bản tin có thể dựa trên nguồn ngoài CSV; không tính recall/độ bỏ sót khi chưa xác lập cùng phạm vi dữ liệu.

## Nhật ký khảo sát/quan sát — chưa thực hiện

Không có câu trả lời khảo sát để điền lúc CP1. Câu hỏi dự kiến cho TA:

1. Lần gần nhất anh/chị rà Discord cuối ngày, anh/chị bắt đầu từ đâu?
2. Phải mở bao nhiêu hội thoại, mất bao lâu? Có thể quan sát một lượt thực tế không?
3. Khi đã có phản hồi, anh/chị dựa vào đâu để biết còn cần theo dõi?
4. Lần gần nhất phải quay lại một vấn đề là khi nào; hậu quả cụ thể là gì?
5. Trường hợp nào anh/chị muốn tự quyết định, không để hệ thống tự nhắn?

| Ngày | Người/vai trò | Câu hỏi | Câu trả lời nguyên văn | Quan sát/số đo | Quyết định |
|---|---|---|---|---|---|
| Chưa thực hiện | — | — | — | — | — |

Hai willing users ở [spec.md §2](../spec.md); đồng ý thử không đồng nghĩa đã xác nhận pain hoặc đã dùng sản phẩm.
