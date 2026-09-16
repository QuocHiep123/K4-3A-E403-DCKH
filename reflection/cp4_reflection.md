# Nhật ký phản ánh — Discord Pulse / Nhóm DCKH

**Ngày:** 17/09/2026 · **Mốc:** CP4  
**Người viết:** Đặng Quốc Hiệp (đại diện nhóm)

---

## Tổng quan quá trình

| Mốc | Trạng thái | Ghi chú nhanh |
|---|---|---|
| CP1 — Canvas | Đã nộp | Evidence mining, 6 trích dẫn thật, 2 willing users |
| CP2 — Mock prototype | Đã nộp | HTML/CSS/JS thuần, 7/7 test pass, 7 case kiểm chứng |
| CP3 — AI thật | Hoàn thiện | analyze.py gọi OpenRouter, golden set 20 case |
| CP4 — Spec đầy đủ | Đang hoàn thiện | Impact table, nghiên cứu tương tự, chốt quality bar |
| CP5 — Dùng thử | Kế hoạch | Mời 5 người ngoài nhóm, đo thời gian thật |

---

## Điều làm tốt

**1. Honesty trong tuyên bố**  
Nhóm giữ ngôn ngữ cẩn thận suốt quá trình: không gọi "có phản hồi" là "đã giải quyết", không extrapolate số mining thành tỷ lệ chính xác AI, ghi rõ mock ở đâu thay thật ở đâu. Đây là quyết định tốn công nhưng đúng hướng.

**2. Thiết kế augment thay vì automate**  
Nguyên tắc "TA luôn quyết định" được giữ nhất quán ở tất cả màn hình. Prototype không tự gửi tin, tự nhắn, hay tự đánh dấu. Luồng "mở nguồn trước, quyết định sau" ngăn ra quyết định thiếu căn cứ.

**3. Code chất lượng từ đầu**  
7 unit test logic pass, HTML/CSS/JS không cần build, chạy được trực tiếp bằng file:// — điều này giúp demo không bị phụ thuộc vào môi trường.

**4. Evidence có thể tái lập**  
analyze_discord.py, metrics.json và sha256 của dữ liệu nguồn được lưu để người khác có thể chạy lại kiểm chứng.

---

## Điều cần cải thiện

**1. Chưa đo được ≤5 phút**  
Mục tiêu "TA chốt danh sách trong ≤5 phút" chưa được đo với người dùng thật. Session timer trong mock/priority-list.html chỉ đo thời gian trong tab, không phải thời gian TA thực sự.

**2. Willing users chưa dùng thử**  
Hai người (Đỗ Đức Đại, Phạm Cường Quốc) đã xác nhận tham gia nhưng chưa có phiên thực tế. CP5 phải giải quyết điều này trước 13:00 18/09.

**3. AI rate limit trên free tier**  
Lần chạy đầu, model nvidia/nemotron trả về confidence=0 vì rate limited upstream. Cần chạy lại khi model available hoặc dùng model dự phòng. Ghi rõ điều này trong eval/README.md thay vì tuyên bố kết quả giả.

**4. Nghiên cứu tương tự chưa đầy đủ**  
CP1 chỉ đọc bản tin bot trong pack. Chưa nghiên cứu sản phẩm bên ngoài (Slack analytics, Discourse summary tools). Bổ sung trước CP4.

---

## Bài học kỹ thuật

| Bài học | Chi tiết |
|---|---|
| HTML file:// không cần web server | Prototype chạy được trực tiếp, không cần build hay deploy, giảm rào cản demo |
| Model free bị rate limit bất kỳ lúc nào | Cần fallback model trong analyze.py, không hardcode model duy nhất |
| LocalStorage đủ cho demo | Không cần backend cho phiên dùng thử ngắn; nhưng cần thông báo rõ "đóng tab mất dữ liệu" |
| Confidence % cần calibration | Số % từ model chưa được calibrate — không dùng như xác suất thật trong spec |

---

## Bài học về process

| Bài học | Chi tiết |
|---|---|
| Phân biệt claim với evidence ngay từ đầu | Mỗi số phải có nguồn kèm theo; không để "ước tính" trở thành "đã đo" |
| Canvas ô 3 (1 câu) rất khó viết đúng | Dễ bị kéo vào số cụ thể chưa đo; phải cẩn thận từng từ |
| Willing user ≠ đã dùng thử | Xác nhận đồng ý và thực sự dùng là hai việc khác nhau |
| Prototype phải chạy được ngay | Demo sập môi trường trước người dùng là thất bại nghiêm trọng |

---

## Kế hoạch CP5

1. **Tổ chức 2 phiên dùng thử** với Đỗ Đức Đại và Phạm Cường Quốc
2. **Mời thêm 3 người** bên ngoài nhóm (ưu tiên TA hoặc coach thật)
3. **Ghi nhật ký** thời gian, quyết định và phản hồi từng người
4. **Cập nhật validation/user_testing.md** với kết quả thật
5. **Chạy lại analyze.py** khi model hết rate limit, cập nhật eval/
6. **Tạo slide PDF** tóm tắt hành trình từ CP1 đến CP5
