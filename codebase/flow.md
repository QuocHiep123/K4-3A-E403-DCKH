# CP2 — Luồng rà soát Discord Pulse

Sơ đồ là phương án kiểm chứng trực tiếp trên GitHub; bản mẫu bấm được nằm ở [index.html](index.html), cách chạy và case ở [README.md](README.md). AI, nguồn và lỗi được giả lập tại CP2.

```mermaid
flowchart TD
  A[TA chọn server, ngày và kịch bản demo] --> B[Tạo lượt rà soát; thay lượt cũ]
  B --> C[Điểm gọi AI: đề xuất trạng thái và căn cứ - MOCK CP2]
  C --> D{Kết quả yêu cầu}
  D -->|Hết thời gian chờ| E[Báo lỗi; giữ phạm vi; không tạo kết quả]
  D -->|Không có tin đầu vào| EMPTY[Báo không có dữ liệu; cho đổi phạm vi hoặc chốt rỗng]
  D -->|Có phản hồi| F{Nguồn hợp lệ?}
  F -->|Không| G[Loại đề xuất; không cho chốt; hiện mã không tồn tại]
  E --> RAW[Kiểm tra dữ liệu đầu vào]
  G --> RAW
  E --> RETRY[TA thử lại: chuyển sang lượt đủ căn cứ giả lập]
  G --> RETRY
  RETRY --> F
  RAW --> A
  F -->|Có| H{Mức chắc chắn giả lập}
  H -->|Cao| I[Hiện đề xuất và lý do gắn nguồn]
  H -->|Thấp| J[Hiện thiếu ngữ cảnh; đề xuất cần kiểm tra thêm]
  I --> K[TA mở và đọc tin nguồn]
  J --> K
  K --> L{TA chọn quyết định}
  L -->|Cần theo dõi / Cần kiểm tra thêm| M[Giữ trong danh sách theo dõi]
  L -->|Đã giải quyết / Bỏ đề xuất| N[Không đưa vào danh sách theo dõi]
  M --> O{Sửa đề xuất hoặc thiếu chắc chắn?}
  N --> O
  O -->|Có| P[TA nhập lý do hoặc điều cần hỏi thêm]
  P --> Q{Lý do đã có?}
  Q -->|Chưa| P
  Q -->|Có| R[Lưu quyết định và lịch sử trong tab]
  O -->|Không| R
  R --> S{Đã duyệt hết?}
  S -->|Chưa| K
  S -->|Rồi| T[TA chốt tối đa 5 hội thoại; có thể 0]
  EMPTY --> T
  T --> U[Hiện danh sách cuối và giới hạn; chưa gửi Discord]
  U --> V[Tải JSON: phạm vi, nguồn, quyết định, lý do, lịch sử]
  U --> W[Quay lại chỉnh sửa]
  W --> K
  R --> X[Mở lại để duyệt: hủy quyết định mục này]
  X --> K
```

**Điểm kết thúc:** TA thấy danh sách đã chốt, có thể tải JSON. Nhánh thiếu nguồn/lỗi không được phép coi như danh sách rỗng thành công. Tải kết quả là thao tác lưu cục bộ, không gửi Discord hoặc nộp form BTC.

**Cost-of-error → augment:** bỏ sót người cần giúp hoặc đánh dấu nhầm đã giải quyết có thể khiến hỗ trợ bị gián đoạn. Vì vậy AI chỉ đề xuất; TA xem nguồn và chốt. Không đánh giá năng lực cá nhân, không tự nhắn và không suy đoán nội dung ảnh thiếu.
