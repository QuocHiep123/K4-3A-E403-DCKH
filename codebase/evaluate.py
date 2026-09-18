"""Evaluate the actual dashboard pipeline. No Discord delivery and no synthetic fallback.

python -m codebase.evaluate prepare
python -m codebase.evaluate run --model provider/model --allow-unreviewed
python -m codebase.evaluate report
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import tempfile
import time

from codebase import analyze, data_input, triage
from codebase.model_config import validate_model

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / 'eval/local'
VERSION = 1


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat()


def save(path, value):
    """Replace only after a complete JSON document has reached disk."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as file:
        temp = Path(file.name)
        try:
            json.dump(value, file, ensure_ascii=False, indent=2, allow_nan=False)
            file.write('\n')
            file.flush()
            os.fsync(file.fileno())
        except BaseException:
            temp.unlink(missing_ok=True)
            raise
    os.replace(temp, path)


def preview(csv_path, scope):
    rows, warnings = data_input.parse_csv(Path(csv_path).read_text(encoding='utf-8-sig'), allow_duplicate_ids=True)
    data = data_input.dataset(rows, 'bundled', 'Evaluation source', warnings)
    return data, data_input.build_preview(data, **scope)


def candidates(review, msg_id):
    return [(m['msg_id'], c) for c in review['conversations'] for m in c['messages'] if m['original_msg_id'] == msg_id]


def prepare(csv_path, golden_path, scope):
    data, review = preview(csv_path, scope)
    golden = read(golden_path)['cases']
    ids = [row['msg_id'] for row in golden]
    if not ids or len(set(ids)) != len(ids):
        raise ValueError('Golden case IDs must be nonempty and unique.')
    manifest = {'schema_version': VERSION, 'created_at': now(), 'csv_path': str(Path(csv_path).resolve()),
                'dataset_fingerprint': data['fingerprint'], 'scope': scope, 'cases': []}
    worksheet = ['# Review evaluation labels before running the model', '',
                 'Read the complete conversation, then edit review.json. Select source_id where ambiguous.',
                 'For each case set expected_label, reviewed_by and evidence_ids. Labels: ' + ', '.join(sorted(triage.LABELS)),
                 'Legacy labels/notes are reference only: they may describe a different message or incomplete context.',
                 'These are conversation-level statuses, not message categories. Do not use model predictions as ground truth.', '']
    for row in golden:
        options = candidates(review, row['msg_id'])
        manifest['cases'].append({'case_id': row['msg_id'], 'msg_id': row['msg_id'],
                                 'source_id': options[0][0] if len(options) == 1 else None,
                                 'source_candidates': [mid for mid, _ in options],
                                 'expected_label': None, 'reviewed_by': '', 'evidence_ids': [],
                                 'legacy_label': row['human_label'], 'legacy_note': row.get('note', '')})
        worksheet += [f"## {row['msg_id']} — legacy label: {row['human_label']}", '', row.get('note', ''), '']
        if not options:
            worksheet += ['INPUT ERROR: No matching conversation in this scope.', '']
        for mid, conversation in options:
            worksheet += [f"### source_id: {mid} · conversation: {conversation['id']}", '',
                          f"{conversation['guild']} / {conversation['channel']}", '', *conversation['warnings'], '']
            for message in conversation['messages']:
                worksheet += [f"**{message['msg_id']} · {message['created_at_vn']} · {message['speaker']}**",
                              '', message['content'], '']
    return manifest, '\n'.join(worksheet)


def resolve(manifest):
    if manifest.get('schema_version') != VERSION:
        raise ValueError('Unsupported review format. Run prepare.')
    data, review = preview(manifest['csv_path'], manifest['scope'])
    if data['fingerprint'] != manifest['dataset_fingerprint']:
        raise ValueError('Source data changed. Prepare and review a new evaluation set.')
    rows = manifest['cases']
    ids = [row['case_id'] for row in rows]
    if not ids or len(set(ids)) != len(ids):
        raise ValueError('Case IDs must be nonempty and unique.')
    inputs, issues, annotations = {}, {}, {}
    for row in rows:
        cid = row['case_id']
        options = candidates(review, row['msg_id'])
        selected = [c for mid, c in options if mid == row.get('source_id')]
        if len(selected) != 1:
            issues[cid] = 'Select exactly one source_id from the source candidates; missing/ambiguous input.'
            continue
        conversation = selected[0]
        if conversation['blocked']:
            issues[cid] = 'Conversation exceeds dashboard limits; no truncation permitted.'
            continue
        inputs[cid] = conversation
        evidence = row.get('evidence_ids')
        source_ids = {m['msg_id'] for m in conversation['messages']}
        annotations[cid] = (row.get('expected_label') in triage.LABELS
                            and isinstance(row.get('reviewed_by'), str) and bool(row['reviewed_by'].strip())
                            and isinstance(evidence, list) and bool(evidence)
                            and all(isinstance(mid, str) and mid in source_ids for mid in evidence))
    counts = Counter(c['id'] for c in inputs.values())
    for cid, conversation in list(inputs.items()):
        if counts[conversation['id']] > 1:
            issues[cid] = 'Two evaluation cases resolve to the same conversation; choose distinct cases.'
            del inputs[cid]
            annotations.pop(cid, None)
    return review, inputs, issues, annotations


def contract(manifest, inputs, model):
    # Includes validators and request settings, not just the prompt: never resume incompatible runs.
    implementation = {name: hashlib.sha256((ROOT / 'codebase' / name).read_bytes()).hexdigest()
                      for name in ['triage.py', 'data_input.py', 'evaluate.py']}
    return digest({'manifest': manifest, 'inputs': inputs, 'model': model, 'implementation': implementation})


def validated_result(row, conversation):
    result = row.get('ai_result')
    if row.get('status') != 'success' or not conversation:
        return None
    try:
        return triage.validate_batch({'results': [result]}, [conversation])[0]
    except (ValueError, TypeError, KeyError):
        return None


def summarize(run):
    """Recompute from rows and frozen labels, never trust a cached summary or match flag."""
    review, inputs, issues, annotations = resolve(run['manifest'])
    expected = {row['case_id']: row for row in run['manifest']['cases']}
    rows = run['cases']
    if len(rows) != len(expected) or {r['case_id'] for r in rows} != set(expected):
        raise ValueError('Run must contain exactly one row for every expected case.')
    if run['contract'] != contract(run['manifest'], inputs, run['model']):
        raise ValueError('Run inputs or implementation changed. Run a new evaluation; old results are not current.')
    results = {r['case_id']: validated_result(r, inputs.get(r['case_id'])) for r in rows}
    successful = sum(v is not None for v in results.values())
    labeled = sum(annotations.values())
    all_labeled = labeled == len(expected)
    attempted = sum(r.get('status') != 'pending' for r in rows)
    # Unrun cases are never silently dropped from denominators.
    scoreable = all_labeled and not issues and all(r['status'] in {'success', 'error'} for r in rows)
    matches = sum(bool(results[cid]) and results[cid]['label'] == row['expected_label'] for cid, row in expected.items()) if scoreable else None
    positives = [cid for cid, row in expected.items() if row.get('expected_label') == 'no-response'] if all_labeled else []
    recall = sum(bool(results[cid]) and results[cid]['label'] == 'no-response' for cid in positives) / len(positives) if scoreable and positives else None
    requests = run.get('requests', [])
    times = [r.get('elapsed_seconds') for r in requests]
    timing_valid = bool(times) and all(type(t) in {int, float} and math.isfinite(t) and t >= 0 for t in times)
    # API seconds are serial request time including failed attempts, divided by all cases.
    average = sum(times) / len(expected) if timing_valid and successful == len(expected) else None
    request_avg = sum(times) / len(times) if timing_valid else None
    citations = run.get('citation_reviews', {})
    citation_checks = []
    for cid, result in results.items():
        manual = citations.get(cid, {})
        if result and manual.get('result_fingerprint') == digest(result) and isinstance(manual.get('reviewed_by'), str) and manual['reviewed_by'].strip() and type(manual.get('supported')) is bool:
            citation_checks.append(manual['supported'])
    citation_rate = sum(citation_checks) / len(expected) if len(citation_checks) == len(expected) else None
    accuracy = matches / len(expected) if scoreable else None
    bars = {'accuracy': None if accuracy is None else accuracy >= .7,
            'recall_no_response': None if recall is None else recall >= .9,
            'citation_validity': None if citation_rate is None else citation_rate >= .95,
            'avg_api_time': None if average is None else average <= 5,
            'ta_completion_time': None}
    warnings = ['Nhãn chuẩn phải được người rà soát trên toàn hội thoại; nhãn cũ không tự chuyển đổi.',
                'ID trích dẫn tồn tại không chứng minh nội dung hỗ trợ kết luận; cần người kiểm tra.',
                'Thời gian API/case = tổng thời gian các request (kể cả retry) / số case; báo riêng thời gian mỗi batch.',
                'Chưa đo thời gian TA hoàn thành; phép thử phân loại không đánh giá chất lượng gom nhóm.']
    if not all_labeled:
        warnings.append(f'Chỉ {labeled}/{len(expected)} case có nhãn đã rà soát. Không công bố accuracy/recall.')
    if successful != len(expected):
        warnings.append(f'{successful}/{len(expected)} case có kết quả hợp lệ; giữ lỗi và case chưa chạy trong báo cáo.')
    if issues:
        warnings.append('Cần sửa nguồn đầu vào: ' + ', '.join(issues))
    return {'success': True, 'mode': 'recorded', 'model': run['model'], 'total_cases': len(rows),
            'expected_cases': len(expected), 'successful_cases': successful, 'attempted_cases': attempted,
            'reviewed_cases': labeled, 'matched': matches, 'accuracy': accuracy,
            'recall_no_response': recall, 'recall_denominator': len(positives) if all_labeled else None,
            'avg_api_time_seconds': average, 'avg_request_seconds': request_avg,
            'citation_validity': citation_rate, 'citation_reviewed_cases': len(citation_checks),
            'complete': successful == len(expected), 'quality_bar_status': 'failed' if False in bars.values() else 'not_assessable',
            'quality_bars': bars, 'warnings': warnings,
            'cases': [{'msg_id': row['case_id'], 'human_label': expected[row['case_id']].get('expected_label'),
                       'ai_label': results[row['case_id']]['label'] if results[row['case_id']] else None,
                       'error': results[row['case_id']] is None, 'status': row['status'],
                       'match': (results[row['case_id']]['label'] == expected[row['case_id']]['expected_label']) if results[row['case_id']] and annotations.get(row['case_id']) else None}
                      for row in rows]}


def execute(manifest, output, model, resume=False, allow_unreviewed=False, max_attempts=3,
            call=None, sleep=time.sleep):
    model = validate_model(model)
    call = call or triage.triage_conversations
    review, inputs, issues, annotations = resolve(manifest)
    if not allow_unreviewed and (issues or not all(annotations.values()) or len(annotations) != len(manifest['cases'])):
        raise ValueError('Review all case labels and resolve source IDs first, or use --allow-unreviewed for diagnostics without accuracy/recall.')
    identity = contract(manifest, inputs, model)
    output = Path(output)
    if output.exists():
        if not resume:
            raise ValueError('Output exists. Use --resume or a new --output path; old runs are never overwritten.')
        run = read(output)
        if run.get('contract') != identity:
            raise ValueError('Cannot resume: model, labels, input scope/data or implementation changed. Use a new output path.')
        summarize(run)  # Verify row identities and current context before spending credits.
    else:
        run = {'schema_version': VERSION, 'created_at': now(), 'model': model, 'contract': identity,
               'manifest': manifest, 'requests': [], 'citation_reviews': {},
               'cases': [{'case_id': row['case_id'], 'status': 'input_error' if row['case_id'] in issues else 'pending',
                          **({'error': issues[row['case_id']]} if row['case_id'] in issues else {})}
                         for row in manifest['cases']]}
    lookup = {row['case_id']: row for row in run['cases']}
    pending = [cid for cid in inputs if validated_result(lookup[cid], inputs[cid]) is None]
    batch_conversations = [inputs[cid] for cid in pending]
    by_conversation = {c['id']: cid for cid, c in inputs.items()}
    def checkpoint():
        run['updated_at'] = now()
        run['summary'] = summarize(run)
        save(output, run)
    checkpoint()
    for batch in data_input.batches(batch_conversations):
        ids = [by_conversation[cid] for cid in batch]
        conversations = [inputs[cid] for cid in ids]
        for attempt in range(max_attempts):
            started = time.monotonic()
            response = call(conversations, review['scope'], model)
            elapsed = round(time.monotonic() - started, 3)
            result_rows = None
            if not response.get('error'):
                try:
                    result_rows = triage.validate_batch(response, conversations)
                except (ValueError, TypeError, KeyError):
                    response = {'error': 'invalid_model_response', 'retryable': False}
            run['requests'].append({'case_ids': ids, 'elapsed_seconds': elapsed, 'completed_at': now(),
                                    **{key: response[key] for key in ['error', 'http_status', 'retryable', 'trace_id', 'request_id', 'served_model', 'usage', 'timing'] if key in response}})
            if result_rows is not None:
                results = {row['id']: row for row in result_rows}
                for cid in ids:
                    lookup[cid].update(status='success', ai_result=results[inputs[cid]['id']], request_index=len(run['requests']) - 1)
                    lookup[cid].pop('error', None)
            else:
                for cid in ids:
                    lookup[cid].update(status='error', error=response.get('error', 'invalid_model_response'))
                    lookup[cid].pop('ai_result', None)
            checkpoint()
            print(f"Saved {run['summary']['successful_cases']}/{len(lookup)} valid cases; batch: {response.get('error', 'success')}", flush=True)
            if result_rows is not None or not response.get('retryable') or attempt + 1 == max_attempts:
                break
            sleep(min(2 ** (attempt + 1), 30))
        if response.get('error') == 'missing_api_key' or response.get('http_status') in {400, 401, 402, 403, 404}:
            break
    return run


def recorded(path):
    result = summarize(read(path))
    result['source'] = str(Path(path).relative_to(ROOT)) if Path(path).is_relative_to(ROOT) else str(path)
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    prep = sub.add_parser('prepare', help='Create source worksheet and blank human annotations; no API calls.')
    prep.add_argument('--csv', type=Path, default=ROOT / 'data/discord-pack/k4_messages.csv')
    prep.add_argument('--golden', type=Path, default=ROOT / 'eval/golden_set.json')
    prep.add_argument('--review', type=Path, default=LOCAL / 'review.json')
    for name in ['guild', 'day', 'channel']:
        prep.add_argument('--' + name, default='')
    run = sub.add_parser('run', help='Call the dashboard classifier; writes an atomic checkpoint after every attempt.')
    run.add_argument('--review', type=Path, default=LOCAL / 'review.json')
    run.add_argument('--output', type=Path, default=LOCAL / 'current_run.json')
    run.add_argument('--model', default=analyze.MODEL)
    run.add_argument('--resume', action='store_true')
    run.add_argument('--allow-unreviewed', action='store_true')
    run.add_argument('--max-attempts', type=int, choices=range(1, 6), default=3)
    report = sub.add_parser('report', help='Recompute metrics; no API calls.')
    report.add_argument('--run', type=Path, default=LOCAL / 'current_run.json')
    report.add_argument('--citations', type=Path, help='Completed citation worksheet JSON from the citations command.')
    citations = sub.add_parser('citations', help='Prepare manual checks of whether cited messages support predictions.')
    citations.add_argument('--run', type=Path, default=LOCAL / 'current_run.json')
    citations.add_argument('--output', type=Path, default=LOCAL / 'citation-review.json')
    args = parser.parse_args(argv)
    try:
        if args.command == 'prepare':
            if args.review.exists() or args.review.with_suffix('.md').exists():
                raise ValueError('Review already exists. Choose a new --review path to preserve human annotations.')
            manifest, worksheet = prepare(args.csv, args.golden, {k: getattr(args, k) for k in ['guild', 'day', 'channel']})
            save(args.review, manifest)
            args.review.with_suffix('.md').write_text(worksheet, encoding='utf-8')
            _, inputs, issues, annotations = resolve(manifest)
            print(json.dumps({'review': str(args.review), 'worksheet': str(args.review.with_suffix('.md')),
                              'cases': len(manifest['cases']), 'ready_inputs': len(inputs), 'input_issues': issues}, indent=2))
        elif args.command == 'run':
            result = execute(read(args.review), args.output, args.model, args.resume, args.allow_unreviewed, args.max_attempts)
            print(json.dumps(result['summary'], ensure_ascii=False, indent=2))
            return 0 if result['summary']['complete'] else 2
        elif args.command == 'citations':
            value = read(args.run)
            summarize(value)
            _, inputs, _, _ = resolve(value['manifest'])
            if args.output.exists():
                raise ValueError('Citation worksheet exists; choose a new output path.')
            checks = {}
            for row in value['cases']:
                result = validated_result(row, inputs.get(row['case_id']))
                if result:
                    checks[row['case_id']] = {'result_fingerprint': digest(result), 'prediction': result,
                                             'messages': inputs[row['case_id']]['messages'],
                                             'supported': None, 'reviewed_by': '', 'note': ''}
            save(args.output, {'contract': value['contract'], 'cases': checks})
            print(f'Saved {len(checks)} citation checks to {args.output}')
        else:
            if args.citations:
                value, checks = read(args.run), read(args.citations)
                if value['contract'] != checks['contract']:
                    raise ValueError('Citation worksheet belongs to a different evaluation run.')
                value['citation_reviews'] = checks['cases']
                value['summary'] = summarize(value)
                save(args.run, value)
            print(json.dumps(recorded(args.run), ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(2, f'Evaluation error: {error}\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
