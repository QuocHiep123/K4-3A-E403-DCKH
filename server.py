"""Local dashboard server. AI failures never produce a successful classification."""
import http.server
import json
import math
import os
from pathlib import Path
import time
from urllib.parse import unquote, urlparse
from codebase import data_input, workflow
from codebase.model_config import model_choices, validate_model

BASE_DIR = Path(__file__).resolve().parent
PORT = int(os.getenv('PORT', '8080'))
try:
    from codebase.analyze import classify_conversation, MODEL, LABELS, validate_result
    from codebase.triage import triage_conversations
except ImportError:
    classify_conversation = None
    triage_conversations = None
    MODEL = None
    LABELS = {'no-response', 'responded-unclear', 'resolved', 'needs-context'}

SAMPLE_CASES = {row['id']: row for row in json.loads((BASE_DIR / 'codebase/demo-cases.json').read_text())}


def recorded_evaluation():
    """Recompute counts from the saved rows, never from unverified summary fields."""
    path = BASE_DIR / 'eval/golden_set_results.json'
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    golden = json.loads((BASE_DIR / 'eval/golden_set.json').read_text(encoding='utf-8-sig'))
    rows = data['cases']
    expected = {row['msg_id']: row['human_label'] for row in golden['cases']}
    if not isinstance(rows, list) or not rows:
        raise ValueError('No recorded cases')
    evaluated = []
    for row in rows:
        result = row.get('ai_result', {})
        failed = bool(result.get('error')) or str(result.get('reasoning', '')).startswith('Loi goi API:') or 'MOCK:' in str(result.get('reasoning', ''))
        valid = False
        if not failed and classify_conversation is not None:
            try:
                validate_result(result)
                valid = True
            except ValueError:
                pass
        elif not failed:
            valid = result.get('label') in LABELS
        evaluated.append({
            'msg_id': row['msg_id'], 'human_label': row['human_label'],
            'ai_label': result.get('label') if valid else None,
            'error': not valid,
            'match': valid and result.get('label') == row['human_label'],
        })
    ids = [row['msg_id'] for row in rows]
    complete = len(ids) == len(expected) and set(ids) == set(expected)
    incompatible = sorted({label for label in expected.values() if label not in LABELS})
    matched = sum(row['match'] for row in evaluated)
    positives = [row for row in evaluated if row['human_label'] == 'no-response']
    recall = sum(row['ai_label'] == 'no-response' for row in positives) / len(positives) if positives else None
    times = [row.get('ai_result', {}).get('api_time_seconds') for row in rows]
    latency_known = all(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0 for value in times) and not any(row['error'] for row in evaluated)
    warnings = ['Kết quả đã lưu; thao tác này không gọi AI hoặc chạy đánh giá mới.',
                'Chưa đo độ hợp lệ của trích dẫn AI; không suy ra 100% từ mã tin đầu vào.']
    if not complete:
        warnings.append(f'Chỉ có {len(rows)}/{len(expected)} case trong lượt được lưu. Chưa đủ đánh giá toàn bộ golden set.')
    if incompatible:
        warnings.append('Golden set có nhãn ngoài bộ nhãn model: ' + ', '.join(incompatible) + '. Cần rà soát bộ nhãn trước khi đánh giá quality bar.')
    if any(row['error'] for row in evaluated):
        warnings.append('Lỗi API/parse được tính là case không đạt, không phải kết quả phân loại. Không báo latency trung bình vì log lỗi cũ không ghi thời gian đầy đủ.')
    return {
        'success': True, 'mode': 'recorded', 'source': 'eval/golden_set_results.json',
        'model': data.get('summary', {}).get('model', 'Không rõ'),
        'total_cases': len(rows), 'expected_cases': len(expected), 'matched': matched,
        'accuracy': matched / len(rows), 'recall_no_response': recall,
        'recall_denominator': len(positives), 'avg_api_time_seconds': sum(times) / len(times) if latency_known else None,
        'citation_validity': None, 'complete': complete, 'quality_bar_status': 'not_assessable',
        'warnings': warnings, 'cases': evaluated,
    }


class PulseRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # User stopped waiting; the completed provider request is still traced.

    def do_POST(self):
        if urlparse(self.path).path in {'/api/import', '/api/preview', '/api/analyze'}:
            self.do_workflow()
            return
        if urlparse(self.path).path != '/api/classify':
            self.send_json(404, {'success': False, 'message': 'Endpoint không tồn tại.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 16384:
                raise ValueError('Invalid body size')
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or not isinstance(data.get('msg_id'), str):
                raise ValueError('Missing case ID')
            case = SAMPLE_CASES.get(data['msg_id'])
            if case is None:
                self.send_json(404, {'success': False, 'message': 'Không tìm thấy hội thoại demo.'})
                return
        except (ValueError, UnicodeDecodeError):
            self.send_json(400, {'success': False, 'message': 'Yêu cầu không hợp lệ.'})
            return
        if classify_conversation is None:
            self.send_json(503, {'success': False, 'message': 'Thiếu thư viện Python. Cài requirements.txt và khởi động lại server.'})
            return
        started = time.monotonic()
        try:
            # Use the same authoritative synthetic conversation shown in /api/cases.
            result = classify_conversation(case['id'], case['content'], case['reply'])
            latency = round(time.monotonic() - started, 3)
            if result.get('error'):
                status = 503 if result['error'] == 'missing_api_key' else 504 if result['error'] == 'upstream_timeout' else 502
                self.send_json(status, {'success': False, 'error': result['error'], 'message': result['message'], 'latency_seconds': latency})
                return
            validate_result(result)
        except Exception:
            self.send_json(502, {'success': False, 'message': 'Không nhận được kết quả AI hợp lệ. Hãy thử lại.'})
            return
        self.send_json(200, {
            'success': True, 'mode': 'live', 'msg_id': case['id'], 'synthetic_input': True,
            'ai_result': result, 'latency_seconds': latency,
            'model': result.get('model_used', MODEL),
        })

    def do_workflow(self):
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 12 * 1024 * 1024:
                raise ValueError('Yêu cầu quá lớn hoặc rỗng. CSV tối đa 2 MB.')
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError('Yêu cầu cần là JSON object.')
            if path == '/api/import':
                result = workflow.import_data(body)
            elif path == '/api/preview':
                result = workflow.preview(body)
            else:
                review, inputs = workflow.batch_input(body)
                if triage_conversations is None:
                    self.send_json(503, {'success': False, 'message': 'Cài requirements.txt rồi khởi động lại server.'})
                    return
                model = validate_model(body.get('model', MODEL))
                result = triage_conversations(inputs, review['scope'], model=model)
                if result.get('error'):
                    status = 503 if result['error'] == 'missing_api_key' else 504 if result['error'] == 'upstream_timeout' else 502
                    self.send_json(status, {'success': False, **result})
                    return
                result.update({'mode': 'live', 'fingerprint': review['fingerprint']})
            self.send_json(200, {'success': True, **result})
        except (ValueError, UnicodeDecodeError) as error:
            self.send_json(400, {'success': False, 'message': str(error)})

    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == '/api/template':
            body = data_input.TEMPLATE.encode('utf-8-sig')
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="discord-pulse-template.csv"')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/api/config':
            self.send_json(200, {'success': True, 'model': MODEL, 'models': model_choices(MODEL)})
            return
        if path == '/api/cases':
            self.send_json(200, {'success': True, 'cases': list(SAMPLE_CASES.values()), 'model': MODEL})
            return
        if path == '/api/eval':
            try:
                self.send_json(200, recorded_evaluation())
            except (OSError, ValueError, KeyError, TypeError):
                self.send_json(503, {'success': False, 'message': 'Không đọc được lượt đánh giá đã lưu. Không có kết quả thay thế.'})
            return
        if not self.static_allowed(path):
            self.send_error(404)
            return
        if path == '/':
            self.path = '/index.html'
        super().do_GET()

    def static_allowed(self, path):
        # Never expose .env, course packs, local state, or directory listings.
        target = (BASE_DIR / path.lstrip('/')).resolve()
        if path == '/':
            return True
        return (target.is_relative_to(BASE_DIR) and target.is_file()
                and not any(part.startswith('.') for part in Path(path).parts if part != '/')
                and (target == BASE_DIR / 'index.html'
                     or (target.is_relative_to(BASE_DIR / 'codebase') and target.suffix in {'.js', '.css', '.html'})))

    def do_HEAD(self):
        path = unquote(urlparse(self.path).path)
        if not self.static_allowed(path):
            self.send_error(404)
            return
        if path == '/':
            self.path = '/index.html'
        super().do_HEAD()


def run_server():
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), PulseRequestHandler) as httpd:
        print(f'Discord Pulse: http://localhost:{PORT}', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')


if __name__ == '__main__':
    run_server()
