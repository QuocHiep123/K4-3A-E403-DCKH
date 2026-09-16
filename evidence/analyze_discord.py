#!/usr/bin/env python3
"""Reproduce CP1 aggregates locally; never exports raw messages or author IDs."""
import argparse
import csv
import hashlib
import json
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--pack", type=Path, default=root / "data/discord-pack")
    args = parser.parse_args()
    source = args.pack / "k4_messages.csv"
    reports_path = args.pack / "k4_daily_reports.md"
    with source.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    rows.sort(key=lambda r: (r["created_at_vn"], r["msg_id"]))
    by_id = {r["msg_id"]: r for r in rows}
    humans = [r for r in rows if r["is_bot"] == "False"]
    sample = [humans[i * (len(humans) - 1) // 49] for i in range(50)]
    annotation_path = Path(__file__).with_name("sample-annotations.json")
    annotations = json.loads(annotation_path.read_text(encoding="utf-8"))
    categories = ("support_request", "needs_context", "other")
    labeled_ids = [mid for category in categories for mid in annotations[category]]
    if len(labeled_ids) != 50 or len(set(labeled_ids)) != 50:
        raise ValueError("Annotations must label 50 distinct messages")
    if set(labeled_ids) != {r["msg_id"] for r in sample}:
        raise ValueError("Pack/sample differs from the manually reviewed sample")
    def timestamp(row):
        return datetime.strptime(row["created_at_vn"], "%Y-%m-%d %H:%M")
    guild_cutoffs = {
        guild: max(timestamp(r) for r in rows if r["guild"] == guild)
        for guild in {r["guild"] for r in rows}
    }
    requests = [by_id[mid] for mid in annotations["support_request"]]
    eligible = [r for r in requests if timestamp(r) + timedelta(hours=4) <= guild_cutoffs[r["guild"]]]
    no_direct_reply = []
    for request in eligible:
        deadline = timestamp(request) + timedelta(hours=4)
        replies = [r for r in rows if r["reply_to"] == request["msg_id"]
                   and r["guild"] == request["guild"]
                   and r["author"] != request["author"]
                   and timestamp(request) <= timestamp(r) <= deadline]
        if not replies:
            no_direct_reply.append(request["msg_id"])
    reports_text = reports_path.read_text(encoding="utf-8")
    reports = [part for part in reports_text.split("\n## ")[1:]]
    output = {
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "reports_sha256": hashlib.sha256(reports_path.read_bytes()).hexdigest(),
        "total_messages": len(rows),
        "human_messages": len(humans),
        "bot_messages": sum(r["is_bot"] == "True" for r in rows),
        "human_author_codes": len({r["author"] for r in humans}),
        "messages_by_guild": dict(Counter(r["guild"] for r in rows)),
        "messages_by_day": dict(Counter(r["created_at_vn"][:10] for r in rows)),
        "reply_messages": sum(r["msg_type"] == "reply" for r in rows),
        "messages_with_reply_to": sum(bool(r["reply_to"]) for r in rows),
        "sample_size": len(sample),
        "sample_ids_in_order": [r["msg_id"] for r in sample],
        "sample_labels": {category: len(annotations[category]) for category in categories},
        "sample_requests_observable_for_4h": len(eligible),
        "sample_requests_without_other_author_direct_reply_within_4h": len(no_direct_reply),
        "sample_no_direct_reply_ids": no_direct_reply,
        "guild_last_observed_at_vn": {guild: time.strftime("%Y-%m-%d %H:%M") for guild, time in sorted(guild_cutoffs.items())},
        "reports": len(reports),
        "reports_with_reference_text_artifact": sum("nguồn tham chiếu" in report for report in reports),
        "reports_with_unconfirmed_resolution_label": sum("Đã có phản hồi, chưa xác nhận đã xử lý" in report for report in reports),
        "unconfirmed_resolution_label_occurrences": reports_text.count("Đã có phản hồi, chưa xác nhận đã xử lý"),
        "limits": [
            "Systematic sample, not random; labels require independent review.",
            "No direct reply is a structural signal, not proof of no answer or unresolved status.",
            "Last observed message is not a guarantee of continuous channel coverage.",
            "Author codes cannot distinguish students, TA, moderators or organizers.",
            "Reports may summarize messages missing from this pack; no coverage/recall claim."
        ]
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
