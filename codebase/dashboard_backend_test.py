"""Offline regression tests: never send messages or call external services."""
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from codebase import analyze


class DashboardBackendTests(unittest.TestCase):
    def post(self, body, raw=False):
        handler = object.__new__(server.PulseRequestHandler)
        payload = body if raw else json.dumps(body).encode()
        handler.path = '/api/classify'
        handler.headers = {'Content-Length': str(len(payload))}
        handler.rfile = io.BytesIO(payload)
        captured = []
        handler.send_json = lambda status, data: captured.append((status, data))
        handler.do_POST()
        return captured[0]

    def test_actual_provider_output_and_authoritative_input(self):
        value = {'label': 'resolved', 'confidence': .11, 'reasoning': 'Actual provider response', 'needs_ta_review': True, 'model_used': 'test-model'}
        with patch.object(server, 'classify_conversation', return_value=value) as classify:
            status, body = self.post({'msg_id': 'DEMO-01', 'content': 'untrusted replacement'})
        self.assertEqual(status, 200)
        self.assertEqual(body['ai_result'], value)
        self.assertEqual(body['mode'], 'live')
        self.assertEqual(classify.call_args.args[1], server.SAMPLE_CASES['DEMO-01']['content'])
        self.assertIsInstance(body['latency_seconds'], float)

    def test_missing_key_does_not_return_a_prediction(self):
        with patch.object(analyze, 'OPENROUTER_API_KEY', ''), patch.object(analyze.requests, 'post') as request:
            status, body = self.post({'msg_id': 'DEMO-01'})
        self.assertEqual(status, 503)
        self.assertFalse(body['success'])
        self.assertNotIn('ai_result', body)
        request.assert_not_called()

    def test_timeout_and_upstream_failure_never_become_needs_context(self):
        for error, status in [(analyze.requests.Timeout(), 504), (analyze.requests.ConnectionError(), 502)]:
            with self.subTest(error=type(error).__name__), patch.object(analyze, 'OPENROUTER_API_KEY', 'test-key'), patch.object(analyze.requests, 'post', side_effect=error):
                actual_status, body = self.post({'msg_id': 'DEMO-01'})
                self.assertEqual(actual_status, status)
                self.assertNotIn('ai_result', body)

    def test_invalid_provider_outputs_are_rejected(self):
        valid = {'label': 'resolved', 'confidence': .8, 'reasoning': 'Done', 'needs_ta_review': False}
        for value in [[], {}, {**valid, 'confidence': True}, {**valid, 'confidence': float('nan')}, {**valid, 'label': 'made-up'}, {**valid, 'reasoning': ''}, {**valid, 'needs_ta_review': 'false'}]:
            with self.subTest(value=value), patch.object(analyze, 'OPENROUTER_API_KEY', 'test-key'):
                response = Mock()
                response.json.return_value = {'choices': [{'message': {'content': json.dumps(value)}}]}
                with patch.object(analyze.requests, 'post', return_value=response):
                    status, body = self.post({'msg_id': 'DEMO-01'})
                self.assertEqual(status, 502)
                self.assertNotIn('ai_result', body)

    def test_bad_requests_do_not_call_model(self):
        with patch.object(server, 'classify_conversation') as classify:
            for raw in [b'{', b'[]', b'{"msg_id":[]}', b'{}']:
                self.assertEqual(self.post(raw, raw=True)[0], 400)
            self.assertEqual(self.post({'msg_id': 'M53930'})[0], 404)
        classify.assert_not_called()

    def test_saved_evaluation_counts_rows_and_identifies_limits(self):
        with patch.object(analyze.requests, 'post') as request:
            result = server.legacy_recorded_evaluation()
        self.assertEqual(result['total_cases'], 3)
        self.assertEqual(result['expected_cases'], 20)
        self.assertEqual(result['matched'], 0)
        self.assertTrue(result['cases'][0]['error'])
        self.assertIsNone(result['cases'][0]['ai_label'])
        self.assertIsNone(result['avg_api_time_seconds'])
        self.assertIsNone(result['citation_validity'])
        self.assertFalse(result['complete'])
        self.assertEqual(result['quality_bar_status'], 'not_assessable')
        self.assertTrue(any('support-request' in warning for warning in result['warnings']))
        request.assert_not_called()

    def test_static_files_exclude_secrets_and_course_data(self):
        handler = object.__new__(server.PulseRequestHandler)
        for path in ['/.env', '/.git/config', '/data/discord-pack/k4_messages.csv', '/codebase/../.env', '/codebase/', '/server.py']:
            self.assertFalse(handler.static_allowed(path), path)
        for path in ['/', '/index.html', '/codebase/dashboard.js']:
            self.assertTrue(handler.static_allowed(path), path)


if __name__ == '__main__':
    unittest.main()
