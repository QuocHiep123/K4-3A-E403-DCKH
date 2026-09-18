import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch, Mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from codebase import data_input as D, workflow as W, triage as T, analyze
import server

CSV = '''msg_id,content,reply_to,created_at_vn,guild,channel,author,is_bot,n_attachments
A,Need help,,2026-09-17 10:00,G,help,u1,False,1
B,What error?,A,2026-09-17 10:01,G,help,u2,False,0
C,Fixed now,B,2026-09-18 10:00,G,help,u1,False,0
D,Separate channel,A,2026-09-17 10:02,G,other,u3,False,0
E,Missing parent,Z,2026-09-17 10:03,G,help,u4,False,0
F,Bot announcement,,2026-09-17 10:04,G,help,bot,True,0
'''


def fixture():
    rows, warnings = D.parse_csv(CSV)
    return D.dataset(rows, 'csv', 'fixture.csv', warnings)


def result(c, **updates):
    return {'id': c['id'], 'label': 'no-response', 'priority': 2, 'confidence': .8,
            'reasoning': 'Needs help', 'evidence_ids': [c['messages'][0]['msg_id']], 'needs_ta_review': True, **updates}


class DataTests(unittest.TestCase):
    def test_bom_and_quoted_multiline_csv(self):
        rows, _ = D.parse_csv('\ufeffmsg_id,content\r\nA,"Hi, there\nnew line"\r\n')
        self.assertEqual(rows[0]['content'], 'Hi, there\nnew line')

    def test_invalid_csv_is_actionable(self):
        for text in ['content\nhello\n', 'msg_id,content\nA,\n', 'msg_id,content\nA,a\nA,b\n', 'msg_id,content\nA,a,extra\n', 'msg_id,content,created_at_vn\nA,a,bad\n']:
            with self.subTest(text=text), self.assertRaises(ValueError): D.parse_csv(text)
        with self.assertRaises(ValueError): D.parse_csv('x' * (D.MAX_BYTES + 1))

    def test_date_cutoff_and_parent_context(self):
        before = D.build_preview(fixture(), 'G', '2026-09-17', 'help')
        group = next(c for c in before['conversations'] if c['id'] == 'A')
        self.assertEqual([m['msg_id'] for m in group['messages']], ['A', 'B'])
        self.assertTrue(group['warnings'])
        after = D.build_preview(fixture(), 'G', '2026-09-18', 'help')
        self.assertEqual([m['msg_id'] for m in after['conversations'][0]['messages']], ['A', 'B', 'C'])
        self.assertNotEqual(before['fingerprint'], after['fingerprint'])
        self.assertEqual(group['messages'][0]['speaker'], 'Người 1')
        self.assertNotIn('"u1"', json.dumps(before, ensure_ascii=False))

    def test_missing_cross_channel_and_bot_only(self):
        p = D.build_preview(fixture(), 'G', '2026-09-17')
        groups = {c['id']: c for c in p['conversations']}
        self.assertNotIn('F', groups)
        self.assertTrue(groups['D']['warnings'])
        self.assertTrue(groups['E']['warnings'])
        self.assertEqual(len(groups['D']['messages']), 1)

    def test_undated_messages_excluded_from_date_filter(self):
        rows, warnings = D.parse_csv('msg_id,content,created_at_vn\nA,Known,2026-09-17 10:00\nB,Unknown,\n')
        data = D.dataset(rows, 'csv', 'x', warnings)
        self.assertEqual(len(D.build_preview(data, day='2026-09-17')['conversations']), 1)
        self.assertEqual(len(D.build_preview(data)['conversations']), 2)

    def test_paste_and_oversized_conversation(self):
        rows, warnings = D.parse_paste('Student: help\nSupport: what error?\n---\nThanks!')
        data = D.dataset(rows, 'paste', 'x', warnings)
        self.assertEqual(len(D.build_preview(data)['conversations']), 2)
        rows, warnings = D.parse_paste('X' * 17000)
        p = D.build_preview(D.dataset(rows, 'paste', 'x', warnings))
        self.assertTrue(p['conversations'][0]['blocked'])
        self.assertEqual(D.batches(p['conversations']), [])

    def test_duplicate_pack_ids_never_overwrite_or_guess_ambiguous_parent(self):
        text = 'msg_id,content,reply_to,created_at_vn\nA,first,,2026-09-17 10:00\nA,second,,2026-09-17 10:01\nB,reply,A,2026-09-17 10:02\n'
        rows, warnings = D.parse_csv(text, allow_duplicate_ids=True)
        p = D.build_preview(D.dataset(rows, 'bundled', 'x', warnings))
        self.assertEqual(len(p['conversations']), 3)
        self.assertEqual(len({c['id'] for c in p['conversations']}), 3)
        self.assertTrue(next(c for c in p['conversations'] if c['id'] == 'B')['warnings'])

    def test_bundled_pack_count_and_real_reply_link(self):
        if not (W.BASE / 'data/discord-pack/k4_messages.csv').exists(): self.skipTest('Local course pack absent')
        imported = W.import_data({'source': 'bundled'})
        self.assertEqual(imported['message_count'], 1092)
        self.assertEqual(imported['human_count'], 779)
        p = W.preview({'dataset_id': imported['dataset_id'], 'guild': 'K4-L3-4', 'day': '2026-09-14'})
        c = next(c for c in p['conversations'] if c['id'] == 'M05023')
        self.assertEqual([m['msg_id'] for m in c['messages']], ['M05023', 'M13539'])
        self.assertEqual(len({c['id'] for c in p['conversations']}), len(p['conversations']))

    def test_new_input_and_scope_have_separate_fingerprints(self):
        a = D.build_preview(fixture(), 'G', '2026-09-17')
        value = fixture(); value['source'] = 'bundled'
        b = D.build_preview(value, 'G', '2026-09-17')
        self.assertNotEqual(a['fingerprint'], b['fingerprint'])


class TriageTests(unittest.TestCase):
    def setUp(self):
        self.cases = D.build_preview(fixture(), 'G', '2026-09-17', 'help')['conversations']

    def test_citations_must_belong_to_same_conversation(self):
        good = [result(c) for c in self.cases]
        self.assertEqual(T.validate_batch({'results': good}, self.cases), good)
        for rows in [good[:-1], good + [good[0]], [{**good[0], 'evidence_ids': ['C']}, *good[1:]], [{**good[0], 'priority': True}, *good[1:]], [{**good[0], 'label': 'other'}, *good[1:]]]:
            with self.assertRaises(ValueError): T.validate_batch({'results': rows}, self.cases)

    def test_real_request_uses_preview_evidence_and_returns_actual_values(self):
        response = Mock(); response.json.return_value = {'id': 'provider-id', 'choices': [{'message': {'content': json.dumps({'results': [result(c) for c in self.cases]})}}]}
        with patch.object(analyze, 'OPENROUTER_API_KEY', 'test'), patch.object(analyze.requests, 'post', return_value=response) as post:
            output = T.triage_conversations(self.cases)
        self.assertEqual(output['request_id'], 'provider-id')
        sent = json.loads(post.call_args.kwargs['json']['messages'][1]['content'])['conversations']
        self.assertEqual(sent[0]['messages'], self.cases[0]['messages'])
        self.assertNotIn('author', sent[0]['messages'][0])

    def test_missing_key_timeout_invalid_json_are_failures(self):
        with patch.object(analyze, 'OPENROUTER_API_KEY', ''), patch.object(analyze.requests, 'post') as post:
            self.assertEqual(T.triage_conversations(self.cases)['error'], 'missing_api_key'); post.assert_not_called()
        with patch.object(analyze, 'OPENROUTER_API_KEY', 'test'), patch.object(analyze.requests, 'post', side_effect=analyze.requests.Timeout):
            self.assertEqual(T.triage_conversations(self.cases)['error'], 'upstream_timeout')
        response = Mock(); response.json.return_value = {'choices': [{'message': {'content': 'invalid'}}]}
        with patch.object(analyze, 'OPENROUTER_API_KEY', 'test'), patch.object(analyze.requests, 'post', return_value=response):
            self.assertEqual(T.triage_conversations(self.cases)['error'], 'invalid_model_response')

    def test_model_selection_is_request_scoped(self):
        default = analyze.MODEL
        response = Mock()
        response.json.return_value = {'model': 'google/gemini-3.8-flash-20260902', 'choices': [{'message': {'content': json.dumps({'results': [result(c) for c in self.cases]})}}]}
        with patch.object(analyze, 'OPENROUTER_API_KEY', 'test'), patch.object(analyze.requests, 'post', return_value=response) as post:
            output = T.triage_conversations(self.cases, model='google/gemini-3.8-flash')
            self.assertEqual(post.call_args.kwargs['json']['model'], 'google/gemini-3.8-flash')
            self.assertEqual(output['model'], 'google/gemini-3.8-flash')
            self.assertEqual(output['served_model'], 'google/gemini-3.8-flash-20260902')
            T.triage_conversations(self.cases)
            self.assertEqual(post.call_args.kwargs['json']['model'], default)
        self.assertEqual(analyze.MODEL, default)

    def test_invalid_model_never_calls_provider(self):
        with patch.object(analyze.requests, 'post') as post:
            for model in ['', 'https://example.com/model', 'bad model', None, 12]:
                if model is None:
                    continue  # None explicitly means the configured default at this layer.
                with self.assertRaises(ValueError): T.triage_conversations(self.cases, model=model)
            post.assert_not_called()

    def test_paid_model_without_credits_reports_actionable_error(self):
        response = Mock(status_code=402)
        response.raise_for_status.side_effect = analyze.requests.HTTPError(response=response)
        with patch.object(analyze, 'OPENROUTER_API_KEY', 'test'), patch.object(analyze.requests, 'post', return_value=response):
            output = T.triage_conversations(self.cases, model='google/gemini-3.8-flash')
        self.assertEqual(output['error'], 'upstream_error')
        self.assertIn('credits', output['message'])
        self.assertNotIn('results', output)

    def test_server_reconstructs_batch_and_rejects_foreign_ids(self):
        d = W.import_data({'source': 'csv', 'text': CSV})
        p = W.preview({'dataset_id': d['dataset_id'], 'guild': 'G', 'day': '2026-09-17', 'channel': 'help'})
        _, cases = W.batch_input({'review_id': p['review_id'], 'ids': ['A'], 'content': 'replacement'})
        self.assertEqual([m['msg_id'] for m in cases[0]['messages']], ['A', 'B'])
        with self.assertRaises(ValueError): W.batch_input({'review_id': p['review_id'], 'ids': ['C']})
        with self.assertRaises(ValueError): W.batch_input({'review_id': 'invalid', 'ids': ['A']})

    def test_http_import_preview_analyze_with_new_data(self):
        def post(path, body):
            h = object.__new__(server.PulseRequestHandler); h.path = path
            raw = json.dumps(body).encode(); h.headers = {'Content-Length': str(len(raw))}; h.rfile = io.BytesIO(raw)
            output = []; h.send_json = lambda status, data: output.append((status, data)); h.do_POST(); return output[0]
        status, d = post('/api/import', {'source': 'paste', 'text': 'New judge question: need help'})
        self.assertEqual(status, 200)
        status, p = post('/api/preview', {'dataset_id': d['dataset_id']})
        self.assertEqual(status, 200)
        with patch.object(server, 'triage_conversations', return_value={'results': [result(p['conversations'][0])], 'model': 'google/gemini-3.8-flash', 'latency_seconds': 1}) as triage:
            status, response = post('/api/analyze', {'review_id': p['review_id'], 'ids': ['PASTE-001'], 'model': 'google/gemini-3.8-flash'})
            self.assertEqual(triage.call_args.kwargs['model'], 'google/gemini-3.8-flash')
        self.assertEqual(status, 200)
        self.assertEqual(response['fingerprint'], p['fingerprint'])
        self.assertEqual(response['results'][0]['id'], 'PASTE-001')
        with patch.object(server, 'triage_conversations') as triage:
            status, response = post('/api/analyze', {'review_id': p['review_id'], 'ids': ['PASTE-001'], 'model': 'not an id'})
            self.assertEqual(status, 400)
            triage.assert_not_called()

if __name__ == '__main__': unittest.main()
