"""Local input parsing and time-bounded Discord reply grouping. No network calls."""
import csv
from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
import re

MAX_BYTES = 2 * 1024 * 1024
MAX_ROWS = 3000
MAX_CONVERSATION_CHARS = 16000
MAX_BATCH_CHARS = 24000
MAX_BATCH_CASES = 6
REQUIRED = {'msg_id', 'content'}
TEMPLATE = '''msg_id,content,reply_to,created_at_vn,guild,channel,author,is_bot,n_attachments
J001,"I cannot open the lab. Can someone help?",,2026-09-18 10:00,Judge-demo,help,user-1,False,0
J002,"What error message do you see?",J001,2026-09-18 10:01,Judge-demo,help,user-2,False,0
J003,"The login problem is fixed now. Thank you!",,2026-09-18 10:02,Judge-demo,help,user-3,False,0
'''


def parse_csv(text, allow_duplicate_ids=False):
    if not isinstance(text, str) or len(text.encode('utf-8')) > MAX_BYTES:
        raise ValueError('CSV tối đa 2 MB, mã hóa UTF-8.')
    reader = csv.DictReader(io.StringIO(text.lstrip('\ufeff')), strict=True)
    headers = reader.fieldnames or []
    if len(headers) != len(set(headers)):
        raise ValueError('CSV có tên cột trùng nhau.')
    missing = REQUIRED - set(headers)
    if missing:
        raise ValueError('Thiếu cột bắt buộc: ' + ', '.join(sorted(missing)) + '. Tải CSV mẫu để xem định dạng.')
    rows, seen, warnings = [], set(), []
    if 'created_at_vn' not in headers:
        warnings.append('CSV không có thời gian: chỉ rà soát toàn bộ file, không suy ra thời gian chờ.')
    try:
        for line, raw in enumerate(reader, 2):
            if len(rows) >= MAX_ROWS:
                raise ValueError(f'CSV tối đa {MAX_ROWS} tin nhắn; hãy chia nhỏ file.')
            if None in raw or any(v is None for v in raw.values()):
                raise ValueError(f'Dòng {line}: số ô không khớp tiêu đề. Đặt nội dung chứa dấu phẩy trong dấu ngoặc kép.')
            mid, content = raw['msg_id'].strip(), raw['content'].strip()
            if not mid or len(mid) > 100 or not content:
                raise ValueError(f'Dòng {line}: msg_id và content phải có giá trị (msg_id tối đa 100 ký tự).')
            if mid in seen and not allow_duplicate_ids:
                raise ValueError(f'Dòng {line}: msg_id trùng {mid}. Mỗi tin cần mã duy nhất.')
            seen.add(mid)
            stamp = raw.get('created_at_vn', '').strip()
            if stamp:
                try:
                    parsed = datetime.fromisoformat(stamp)
                    if parsed.tzinfo is not None:
                        raise ValueError()
                    stamp = parsed.isoformat(sep=' ', timespec='seconds')
                except ValueError:
                    raise ValueError(f'Dòng {line}: created_at_vn cần YYYY-MM-DD HH:MM[:SS], giờ Việt Nam, không kèm múi giờ.')
            bot = raw.get('is_bot', 'false').strip().lower() or 'false'
            if bot not in {'true', 'false', '1', '0'}:
                raise ValueError(f'Dòng {line}: is_bot cần True hoặc False.')
            try:
                attachments = int(raw.get('n_attachments', '0') or '0')
                if attachments < 0:
                    raise ValueError()
            except ValueError:
                raise ValueError(f'Dòng {line}: n_attachments cần số nguyên không âm.')
            row = {
                'msg_id': mid, 'content': content, 'reply_to': raw.get('reply_to', '').strip(),
                'created_at_vn': stamp, 'guild': raw.get('guild', '').strip() or 'Imported',
                'channel': raw.get('channel', '').strip() or 'general',
                'author': raw.get('author', '').strip() or '', 'is_bot': bot in {'true', '1'},
                'n_attachments': attachments,
            }
            if row['reply_to'] == mid:
                raise ValueError(f'Dòng {line}: tin nhắn không được reply chính nó.')
            rows.append(row)
    except csv.Error as error:
        raise ValueError('CSV không hợp lệ: ' + str(error)) from error
    if not rows:
        raise ValueError('CSV không có tin nhắn. Thêm ít nhất một dòng dữ liệu.')
    if any(not row['created_at_vn'] for row in rows):
        warnings.append('Một số tin không có thời gian; khi chọn ngày, các tin đó sẽ bị loại để tránh dùng ngữ cảnh tương lai.')
    counts = Counter(row['msg_id'] for row in rows)
    occurrences = Counter()
    for row in rows:
        mid = row['msg_id']
        occurrences[mid] += 1
        row['source_id'] = f'{mid}#{occurrences[mid]}' if counts[mid] > 1 else mid
    if any(count > 1 for count in counts.values()):
        warnings.append('Pack có mã tin trùng: thêm hậu tố # để phân biệt nguồn. Reply có nhiều tin cha khả dĩ không được nối bằng phỏng đoán.')
    return rows, warnings


def parse_paste(text):
    if not isinstance(text, str) or not text.strip():
        raise ValueError('Dán ít nhất một hội thoại trước khi xem dữ liệu.')
    if len(text) > 30000:
        raise ValueError('Nội dung dán tối đa 30.000 ký tự; dùng CSV cho bộ lớn hơn.')
    blocks = [part.strip() for part in re.split(r'^\s*---\s*$', text, flags=re.M) if part.strip()]
    rows = [{'msg_id': f'PASTE-{i:03}', 'source_id': f'PASTE-{i:03}', 'content': block, 'reply_to': '', 'created_at_vn': '',
             'guild': 'Pasted', 'channel': 'conversation', 'author': '', 'is_bot': False, 'n_attachments': 0}
            for i, block in enumerate(blocks, 1)]
    return rows, ['Nội dung dán không có thời gian chuẩn hóa; không suy ra thời gian chờ. Mỗi khối ngăn bởi --- là một hội thoại.']


def dataset(rows, source, name, warnings):
    fingerprint = hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    return {'rows': rows, 'source': source, 'name': name[:120], 'fingerprint': fingerprint, 'warnings': warnings}


def metadata(data):
    rows = data['rows']
    return {key: data[key] for key in ['source', 'name', 'fingerprint', 'warnings']} | {
        'message_count': len(rows), 'human_count': sum(not row['is_bot'] for row in rows),
        'guilds': sorted({row['guild'] for row in rows}),
        'dates': sorted({row['created_at_vn'][:10] for row in rows if row['created_at_vn']}),
        'channels': sorted({row['channel'] for row in rows}),
        'scopes': [{'guild': guild,
                    'dates': sorted({row['created_at_vn'][:10] for row in rows if row['guild'] == guild and row['created_at_vn']}),
                    'channels': sorted({row['channel'] for row in rows if row['guild'] == guild})}
                   for guild in sorted({row['guild'] for row in rows})],
    }


def build_preview(data, guild='', day='', channel=''):
    if not all(isinstance(value, str) for value in [guild, day, channel]):
        raise ValueError('Bộ lọc không hợp lệ.')
    if day:
        try:
            datetime.strptime(day, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Ngày cần định dạng YYYY-MM-DD.')
    rows = [row for row in data['rows'] if (not guild or row['guild'] == guild)
            and (not channel or row['channel'] == channel)
            and (not day or (row['created_at_vn'] and row['created_at_vn'][:10] <= day))]
    by_id = {row['source_id']: row for row in rows}
    candidates = defaultdict(list)
    for row in rows:
        candidates[row['msg_id']].append(row)
    parents = {mid: mid for mid in by_id}

    def root(mid):
        while parents[mid] != mid:
            parents[mid] = parents[parents[mid]]
            mid = parents[mid]
        return mid

    broken = set()
    for row in rows:
        ref = row['reply_to']
        if not ref:
            continue
        matching = [p for p in candidates[ref] if (p['guild'], p['channel']) == (row['guild'], row['channel'])
                    and not (p['created_at_vn'] and row['created_at_vn'] and p['created_at_vn'] > row['created_at_vn'])]
        if len(matching) != 1:
            broken.add(row['source_id'])
            continue
        parent = matching[0]
        a, b = root(row['source_id']), root(parent['source_id'])
        if a != b:
            parents[a] = b
        else:
            broken.add(row['source_id'])
    groups = {}
    for row in rows:
        groups.setdefault(root(row['source_id']), []).append(row)
    conversations = []
    for group in groups.values():
        group.sort(key=lambda row: (row['created_at_vn'], row['msg_id']))
        if all(row['is_bot'] for row in group) or (day and not any(row['created_at_vn'][:10] == day for row in group)):
            continue
        first = next(row for row in group if not row['is_bot'])
        # Only per-conversation aliases are exposed/sent; never infer TA vs student.
        aliases = {}
        messages = []
        for row in group:
            identity = row['author'] or row['msg_id']
            if identity not in aliases:
                aliases[identity] = f'Người {len(aliases) + 1}'
            messages.append({key: row[key] for key in ['content', 'reply_to', 'created_at_vn', 'is_bot', 'n_attachments']} |
                            {'msg_id': row['source_id'], 'original_msg_id': row['msg_id'],
                             'speaker': 'Bot' if row['is_bot'] else aliases[identity]})
        warnings = []
        if any(row['source_id'] in broken for row in group):
            warnings.append('Có reply thiếu tin cha, sai phạm vi/thời gian hoặc liên kết vòng. Ngữ cảnh có thể chưa đầy đủ.')
        if any(row['n_attachments'] for row in group):
            warnings.append('Có tệp/ảnh đính kèm không được cung cấp; không suy đoán nội dung ảnh.')
        size = sum(len(row['content']) for row in messages)
        blocked = size > MAX_CONVERSATION_CHARS or len(messages) > 80
        if blocked:
            warnings.append('Hội thoại vượt 16.000 ký tự hoặc 80 tin; cần chia nhỏ trước khi gọi AI. Nội dung không bị cắt âm thầm.')
        conversations.append({'id': first['source_id'], 'title': first['content'][:110], 'guild': first['guild'],
                              'channel': first['channel'], 'messages': messages, 'warnings': warnings,
                              'last_at': group[-1]['created_at_vn'], 'blocked': blocked})
    conversations.sort(key=lambda item: (item['last_at'], item['id']), reverse=True)
    digest = hashlib.sha256(json.dumps([data['fingerprint'], data['source'], guild, day, channel, conversations], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return {'conversations': conversations, 'scope': {'guild': guild, 'day': day, 'channel': channel},
            'source': data['source'], 'name': data['name'], 'fingerprint': digest,
            'message_count': sum(len(item['messages']) for item in conversations),
            'warnings': data['warnings'] + ['Chỉ nối qua reply_to trong cùng server/kênh. Không có reply trực tiếp không chứng minh chưa được trả lời.']}


def batches(conversations):
    output, batch, size = [], [], 0
    for item in conversations:
        if item['blocked']:
            continue
        item_size = len(json.dumps(item, ensure_ascii=False))
        if batch and (len(batch) >= MAX_BATCH_CASES or size + item_size > MAX_BATCH_CHARS):
            output.append(batch)
            batch, size = [], 0
        batch.append(item['id'])
        size += item_size
    if batch:
        output.append(batch)
    return output
