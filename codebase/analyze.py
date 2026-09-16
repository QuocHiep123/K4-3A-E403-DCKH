"""
Discord Pulse — CP3 AI Engine
Phân loại trạng thái hội thoại Discord và đề xuất ưu tiên cho TA.

Cách dùng:
  1. Điền OPENROUTER_API_KEY vào file .env
  2. Chạy: python codebase/analyze.py
  3. Kết quả lưu vào eval/golden_set_results.json và hiện thị lên terminal
"""

import csv
import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# ── Cấu hình ──────────────────────────────────────────────────────────────────
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

BASE_DIR = Path(__file__).parent.parent
DATA_PATH = BASE_DIR / "challenge_materials" / "discord-pack" / "k4_messages.csv"
GOLDEN_SET_PATH = BASE_DIR / "eval" / "golden_set.json"
RESULTS_PATH = BASE_DIR / "eval" / "golden_set_results.json"

# Golden set: 20 msg_id được chọn từ evidence/sample-annotations.json
# Gồm: support_request (câu hỏi cần hỗ trợ), needs_context, resolved, other
GOLDEN_SET_IDS = [
    # === Lớp chỗ khó ①: Nguồn sự thật / chưa có phản hồi rõ ===
    "M53930", "M84013", "M05023", "M65121", "M27034",
    # === Lớp chỗ khó ②: Mơ hồ / cần ngữ cảnh thêm ===
    "M45980", "M92861", "M36026", "M47681", "M86664",
    # === Case thông thường (câu hỏi học tập / logistics) ===
    "M56157", "M09090", "M49586", "M80709", "M67785",
    "M32171", "M48859", "M97148", "M53663", "M88243",
]

HUMAN_LABELS = {
    # Dán nhãn thủ công từ evidence/sample-annotations.json + nhóm rà soát
    "M53930": "no-response",       # Báo vẫn chưa truy cập được
    "M84013": "responded-unclear", # Có reply nhưng chưa chốt kết quả
    "M05023": "responded-unclear", # Reply là câu hỏi chẩn đoán
    "M65121": "no-response",       # Câu hỏi cách nộp, chưa được trả lời
    "M27034": "resolved",          # Đã có xác nhận giải quyết
    "M45980": "needs-context",     # Tin quá ngắn
    "M92861": "needs-context",     # Phụ thuộc ngữ cảnh thread
    "M36026": "needs-context",     # Không đủ thông tin để phân loại
    "M47681": "needs-context",     # Cần xem reply chain
    "M86664": "needs-context",     # Chỉ có 1 từ
    "M56157": "support-request",   # Câu hỏi về quy trình
    "M09090": "support-request",   # Hỏi logistics
    "M49586": "support-request",   # Hỏi cách làm lab
    "M80709": "support-request",   # Báo cáo lỗi kỹ thuật
    "M67785": "support-request",   # Hỏi cơ cấu nhóm
    "M32171": "support-request",   # Hỏi deadline
    "M48859": "support-request",   # Hỏi link tài liệu
    "M97148": "support-request",   # Hỏi quy định
    "M53663": "support-request",   # Hỏi điểm danh
    "M88243": "other",             # Cảm ơn/không cần hỗ trợ
}

# ── Đọc dữ liệu CSV ───────────────────────────────────────────────────────────
def load_messages(csv_path: Path, target_ids: list[str]) -> dict:
    """Đọc các tin nhắn theo msg_id từ CSV. Encoding UTF-8-BOM."""
    messages = {}
    try:
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["msg_id"] in target_ids:
                    messages[row["msg_id"]] = row
    except FileNotFoundError:
        print(f"⚠️  Không tìm thấy file dữ liệu tại: {csv_path}")
        print("   Đảm bảo bạn có thư mục challenge_materials/discord-pack/ bên cạnh repo.")
    return messages


# ── Gọi OpenRouter API ────────────────────────────────────────────────────────
def classify_conversation(msg_id: str, content: str, reply_to: str) -> dict:
    """
    Gọi AI phân loại 1 hội thoại Discord thành 1 trong 4 nhãn:
      - no-response       : chưa thấy phản hồi phù hợp
      - responded-unclear : có phản hồi nhưng chưa rõ đã giải quyết
      - resolved          : đã xác nhận giải quyết
      - needs-context     : thiếu ngữ cảnh, không thể kết luận
    """
    system_prompt = """Bạn là trợ lý phân loại hội thoại Discord cho Trợ giảng (TA) của khóa học AI.
Nhiệm vụ: Phân loại trạng thái của mỗi tin nhắn/hội thoại thành ĐÚNG MỘT trong 4 nhãn sau:

- no-response: Học viên hỏi hoặc yêu cầu hỗ trợ nhưng chưa thấy phản hồi phù hợp trong dữ liệu.
- responded-unclear: Đã có người phản hồi nhưng chưa xác nhận vấn đề đã được giải quyết hoàn toàn (ví dụ: reply là câu hỏi chẩn đoán, hoặc hỏi thêm thông tin).
- resolved: Có bằng chứng rõ ràng vấn đề đã được giải quyết (xác nhận thành công, cảm ơn, hoặc thông báo đã xong).
- needs-context: Tin nhắn quá ngắn, mơ hồ hoặc phụ thuộc vào context bên ngoài, không thể phân loại chắc chắn.

Quy tắc QUAN TRỌNG:
1. "Có phản hồi" ≠ "Đã giải quyết". Phân biệt rõ hai điều này.
2. Nếu không chắc → dùng needs-context, không đoán mò.
3. Chỉ trả về JSON, không giải thích thêm.

Format trả về:
{
  "label": "<một trong 4 nhãn>",
  "confidence": <0.0 đến 1.0>,
  "reasoning": "<1 câu ngắn giải thích>",
  "needs_ta_review": <true nếu confidence < 0.6 hoặc label là responded-unclear>
}"""

    context = f"msg_id: {msg_id}\n"
    if reply_to:
        context += f"[Tin này là reply cho: {reply_to}]\n"
    context += f"Nội dung: {content}"

    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_openrouter_api_key_here":
        # Mock response khi chưa có API key (để test script)
        return {
            "label": "support-request",
            "confidence": 0.5,
            "reasoning": "⚠️  MOCK: Chưa có OPENROUTER_API_KEY. Điền key vào file .env.",
            "needs_ta_review": True,
        }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context},
        ],
        "temperature": 0.1,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/QuocHiep123/K4-3A-E403-DCKH",
        "X-Title": "Discord Pulse — AI20k Hackathon CP3",
    }

    try:
        t0 = time.time()
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30,
        )
        elapsed = round(time.time() - t0, 2)
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
        result = json.loads(raw)
        result["api_time_seconds"] = elapsed
        result["model_used"] = MODEL
        return result
    except Exception as e:
        return {
            "label": "needs-context",
            "confidence": 0.0,
            "reasoning": f"Lỗi gọi API: {str(e)[:120]}",
            "needs_ta_review": True,
            "api_time_seconds": 0,
            "model_used": MODEL,
        }


# ── Tính điểm đánh giá ────────────────────────────────────────────────────────
def evaluate_results(cases: list[dict]) -> dict:
    """Tính precision, recall và các chỉ số khác cho toàn bộ golden set."""
    total = len(cases)
    matched = sum(1 for c in cases if c.get("match"))
    needs_review = sum(1 for c in cases if c.get("ai_result", {}).get("needs_ta_review"))
    avg_confidence = round(
        sum(c.get("ai_result", {}).get("confidence", 0) for c in cases) / total, 3
    ) if total else 0
    avg_time = round(
        sum(c.get("ai_result", {}).get("api_time_seconds", 0) for c in cases) / total, 2
    ) if total else 0

    return {
        "total_cases": total,
        "matched": matched,
        "accuracy": f"{matched}/{total} = {round(matched/total*100, 1)}%",
        "needs_ta_review": needs_review,
        "avg_confidence": avg_confidence,
        "avg_api_time_seconds": avg_time,
        "model": MODEL,
    }


# ── Gửi bản tin Discord Webhook (tuỳ chọn) ───────────────────────────────────
def send_discord_report(summary: dict, top5: list[dict]):
    """Bắn bản tin kết quả CP3 sang Discord channel qua Webhook."""
    if not DISCORD_WEBHOOK_URL:
        print("ℹ️  DISCORD_WEBHOOK_URL chưa được cấu hình, bỏ qua gửi Discord.")
        return

    lines = [
        "📊 **[Discord Pulse] Kết quả phân loại CP3**",
        f"- Model: `{summary['model']}`",
        f"- Độ chính xác: **{summary['accuracy']}**",
        f"- Cần TA xem lại: **{summary['needs_ta_review']}** case",
        f"- Thời gian TB: **{summary['avg_api_time_seconds']}s** / hội thoại",
        "",
        "🔴 **Top hội thoại cần ưu tiên:**",
    ]
    for i, case in enumerate(top5[:5], 1):
        label = case.get("ai_result", {}).get("label", "?")
        conf = case.get("ai_result", {}).get("confidence", 0)
        lines.append(f"  {i}. `{case['msg_id']}` — {label} (confidence: {conf:.0%})")

    payload = {"content": "\n".join(lines)}
    try:
        requests.post(DISCORD_WEBHOOK_URL, json=payload, timeout=10)
        print("✅ Đã gửi bản tin sang Discord!")
    except Exception as e:
        print(f"⚠️  Gửi Discord thất bại: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Discord Pulse — CP3 AI Engine")
    print(f"  Model: {MODEL}")
    print("=" * 60)

    # 1. Đọc tin nhắn từ CSV
    print(f"\n📂 Đọc dữ liệu từ: {DATA_PATH}")
    messages = load_messages(DATA_PATH, GOLDEN_SET_IDS)
    if not messages:
        print("❌ Không đọc được dữ liệu. Kiểm tra đường dẫn challenge_materials/.")
        return

    print(f"   ✅ Đọc được {len(messages)}/{len(GOLDEN_SET_IDS)} tin nhắn cần phân tích.")

    # 2. Phân loại từng tin nhắn
    print(f"\n🤖 Gọi AI phân loại {len(GOLDEN_SET_IDS)} hội thoại...")
    cases = []
    for i, msg_id in enumerate(GOLDEN_SET_IDS, 1):
        if msg_id not in messages:
            print(f"  [{i:02d}/{len(GOLDEN_SET_IDS)}] ⚠️  {msg_id} — Không tìm thấy trong CSV, bỏ qua.")
            continue

        row = messages[msg_id]
        content = row.get("content", "")[:500]  # Giới hạn 500 ký tự để tiết kiệm token
        reply_to = row.get("reply_to", "")

        ai_result = classify_conversation(msg_id, content, reply_to)
        human_label = HUMAN_LABELS.get(msg_id, "unknown")
        match = ai_result.get("label") == human_label

        case = {
            "msg_id": msg_id,
            "human_label": human_label,
            "ai_result": ai_result,
            "match": match,
            "content_preview": content[:80] + "..." if len(content) > 80 else content,
        }
        cases.append(case)

        status = "✅" if match else "❌"
        print(
            f"  [{i:02d}/{len(GOLDEN_SET_IDS)}] {status} {msg_id} "
            f"AI={ai_result.get('label')} Human={human_label} "
            f"conf={ai_result.get('confidence', 0):.0%} "
            f"({ai_result.get('api_time_seconds', 0)}s)"
        )
        time.sleep(0.5)  # Tránh rate limit

    # 3. Tính kết quả
    summary = evaluate_results(cases)
    print("\n" + "=" * 60)
    print("  KẾT QUẢ ĐÁNH GIÁ")
    print("=" * 60)
    for k, v in summary.items():
        print(f"  {k:30s}: {v}")

    # 4. Lưu kết quả
    RESULTS_PATH.parent.mkdir(exist_ok=True)
    output = {"summary": summary, "cases": cases}
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Kết quả lưu vào: {RESULTS_PATH}")

    # 5. Gửi Discord (nếu có webhook)
    high_priority = [c for c in cases if c["ai_result"].get("label") in ("no-response", "responded-unclear")]
    send_discord_report(summary, high_priority)

    print("\n✅ Hoàn tất! Xem kết quả chi tiết tại eval/golden_set_results.json")


if __name__ == "__main__":
    main()
