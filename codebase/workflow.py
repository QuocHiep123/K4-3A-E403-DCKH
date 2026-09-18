"""Bounded in-memory imports/previews, shared by HTTP and offline tests."""
from collections import OrderedDict
import json
from pathlib import Path
import secrets
import threading
import time
from codebase import data_input

BASE = Path(__file__).resolve().parents[1]
LOCK = threading.RLock()
DATASETS = OrderedDict()
PREVIEWS = OrderedDict()
TTL_SECONDS = 4 * 60 * 60


def put(store, value, limit):
    with LOCK:
        key = secrets.token_urlsafe(24)
        store[key] = (time.monotonic(), value)
        while len(store) > limit:
            store.popitem(last=False)
        return key


def get(store, key):
    if not isinstance(key, str):
        raise ValueError('Thiếu mã dữ liệu. Hãy nhập dữ liệu trước.')
    with LOCK:
        record = store.get(key)
        if record is None or time.monotonic() - record[0] > TTL_SECONDS:
            store.pop(key, None)
            raise ValueError('Phiên dữ liệu đã hết hạn hoặc server đã khởi động lại. Hãy nhập lại dữ liệu.')
        store.move_to_end(key)
        return record[1]


def import_data(body):
    source = body.get('source')
    if source == 'bundled':
        path = BASE / 'data/discord-pack/k4_messages.csv'
        try:
            text = path.read_text(encoding='utf-8-sig')
        except OSError:
            raise ValueError('Không tìm thấy data/discord-pack/k4_messages.csv. Hãy tải CSV của bạn lên.')
        rows, warnings = data_input.parse_csv(text, allow_duplicate_ids=True)
        name = 'Discord khoá 4 · 12–14/09/2026'
    elif source == 'csv':
        rows, warnings = data_input.parse_csv(body.get('text'))
        name = body.get('name', 'Uploaded CSV')
        if not isinstance(name, str):
            raise ValueError('Tên file không hợp lệ.')
    elif source == 'paste':
        rows, warnings = data_input.parse_paste(body.get('text'))
        name = 'Hội thoại được dán'
    else:
        raise ValueError('Chọn dữ liệu có sẵn, CSV hoặc hội thoại dán.')
    value = data_input.dataset(rows, source, name, warnings)
    return data_input.metadata(value) | {'dataset_id': put(DATASETS, value, 12)}


def preview(body):
    data = get(DATASETS, body.get('dataset_id'))
    value = data_input.build_preview(data, body.get('guild', ''), body.get('day', ''), body.get('channel', ''))
    value['batches'] = data_input.batches(value['conversations'])
    return value | {'review_id': put(PREVIEWS, value, 24)}


def batch_input(body):
    review = get(PREVIEWS, body.get('review_id'))
    ids = body.get('ids')
    if not isinstance(ids, list) or not ids or len(ids) > data_input.MAX_BATCH_CASES or any(not isinstance(mid, str) for mid in ids) or len(set(ids)) != len(ids):
        raise ValueError('Chọn 1–6 hội thoại khác nhau cho mỗi lượt.')
    lookup = {item['id']: item for item in review['conversations']}
    if any(mid not in lookup or lookup[mid]['blocked'] for mid in ids):
        raise ValueError('Hội thoại không thuộc bản xem trước hoặc vượt giới hạn. Hãy xem lại dữ liệu.')
    inputs = [lookup[mid] for mid in ids]
    if len(inputs) > 1 and sum(len(json.dumps(item, ensure_ascii=False)) for item in inputs) > data_input.MAX_BATCH_CHARS:
        raise ValueError('Lượt quá dài; chia nhỏ các hội thoại.')
    return review, inputs
