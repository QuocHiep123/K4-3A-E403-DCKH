"""Offline evaluation regression tests; synthetic inputs and no provider calls."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from codebase import evaluate as E, triage as T, analyze
import server


def prediction(c):
    return {'id': c['id'], 'label': 'no-response', 'priority': 2, 'confidence': .8,
            'reasoning': 'Question has no answer', 'evidence_ids': [c['messages'][0]['msg_id']], 'needs_ta_review': True}


def success(conversations, scope, model):
    return {'results': [prediction(c) for c in conversations]}


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.csv = self.root / 'source.csv'
        self.golden = self.root / 'golden.json'
        self.output = self.root / 'run.json'
        self.csv.write_text('msg_id,content,reply_to,created_at_vn,guild,channel\n'
                           'A,Question,,2026-09-17 10:00,G,help\n'
                           'B,Diagnostic reply,A,2026-09-17 10:01,G,help\n'
                           'C,Fixed now,B,2026-09-18 10:00,G,help\n'
                           'D,Another question,,2026-09-17 10:00,G,help\n'
                           'E,Duplicate first,,2026-09-17 10:00,G,help\n'
                           'E,Duplicate second,,2026-09-17 10:02,G,help\n')
        E.save(self.golden, {'cases': [{'msg_id': mid, 'human_label': 'support-request'} for mid in ['A', 'D']]})
        self.manifest, self.worksheet = E.prepare(self.csv, self.golden, {'guild': 'G', 'day': '2026-09-17', 'channel': 'help'})

    def label(self):
        for row in self.manifest['cases']:
            row.update(expected_label='no-response', reviewed_by='Test human', evidence_ids=[row['source_id']])

    def run_eval(self, **kwargs):
        return E.execute(self.manifest, self.output, 'test/model', call=kwargs.pop('call', success), **kwargs)

    def test_exact_dashboard_context_and_time_cutoff_no_legacy_labels_sent(self):
        call = Mock(side_effect=success)
        self.run_eval(allow_unreviewed=True, call=call)
        convs, scope, model = call.call_args.args
        a = next(c for c in convs if c['id'] == 'A')
        self.assertEqual([m['msg_id'] for m in a['messages']], ['A', 'B'])
        self.assertIn('Diagnostic reply', self.worksheet)
        self.assertNotIn('Fixed now', self.worksheet)
        self.assertNotIn('expected_label', json.dumps(convs))
        self.assertNotIn('support-request', json.dumps(convs))
        self.assertEqual(scope['day'], '2026-09-17')

    def test_unreviewed_never_scores_and_default_refuses_network(self):
        call = Mock(side_effect=success)
        with self.assertRaisesRegex(ValueError, 'Review all'):
            self.run_eval(call=call)
        call.assert_not_called()
        r = self.run_eval(allow_unreviewed=True)['summary']
        self.assertEqual(r['successful_cases'], 2)
        self.assertIsNone(r['accuracy'])
        self.assertIsNone(r['recall_no_response'])
        self.assertEqual(r['quality_bar_status'], 'not_assessable')

    def test_ambiguous_missing_and_duplicate_conversations_are_explicit(self):
        E.save(self.golden, {'cases': [{'msg_id': x, 'human_label': 'other'} for x in ['A', 'B', 'E', 'MISSING']]})
        manifest, _ = E.prepare(self.csv, self.golden, self.manifest['scope'])
        _, inputs, issues, _ = E.resolve(manifest)
        self.assertFalse(inputs)
        self.assertEqual(set(issues), {'A', 'B', 'E', 'MISSING'})
        self.assertEqual(manifest['cases'][2]['source_candidates'], ['E#2', 'E#1'])
        manifest['cases'] = [manifest['cases'][2]]
        manifest['cases'][0]['source_id'] = 'E#2'
        self.assertEqual(len(E.resolve(manifest)[1]), 1)

    def test_invalid_label_or_evidence_does_not_become_human_ground_truth(self):
        self.label()
        for key, value in [('expected_label', 'support-request'), ('evidence_ids', ['outside']), ('reviewed_by', '')]:
            with self.subTest(key=key):
                original = copy.deepcopy(self.manifest)
                self.manifest['cases'][0][key] = value
                with self.assertRaisesRegex(ValueError, 'Review all'):
                    self.run_eval()
                self.manifest = original

    def test_metrics_recomputed_and_citation_semantics_not_inferred(self):
        self.label()
        run = self.run_eval()
        run['summary']['accuracy'] = 0
        r = E.summarize(run)
        self.assertEqual(r['accuracy'], 1)
        self.assertEqual(r['recall_no_response'], 1)
        self.assertIsNone(r['citation_validity'])
        for row in run['cases']:
            run['citation_reviews'][row['case_id']] = {'result_fingerprint': E.digest(row['ai_result']), 'supported': True, 'reviewed_by': 'Human'}
        self.assertEqual(E.summarize(run)['citation_validity'], 1)
        run['cases'][0]['ai_result']['reasoning'] = 'Changed prediction'
        self.assertIsNone(E.summarize(run)['citation_validity'])

    def test_transient_retry_checkpoints_and_successful_resume_makes_no_calls(self):
        self.label()
        failure = {'error': 'upstream_error', 'retryable': True, 'http_status': 429}
        call = Mock(side_effect=[failure, success(list(E.resolve(self.manifest)[1].values()), {}, '')])
        sleep = Mock()
        run = self.run_eval(call=call, sleep=sleep)
        self.assertEqual(len(run['requests']), 2)
        self.assertEqual(run['requests'][0]['http_status'], 429)
        self.assertEqual(E.read(self.output)['summary']['successful_cases'], 2)
        sleep.assert_called_once_with(2)
        no_call = Mock(side_effect=AssertionError('Already completed'))
        self.run_eval(resume=True, call=no_call)
        no_call.assert_not_called()

    def test_errors_stay_in_denominator_and_no_zero_latency_claim(self):
        self.label()
        call = Mock(return_value={'error': 'upstream_error', 'http_status': 401, 'retryable': False})
        r = self.run_eval(call=call)['summary']
        self.assertEqual(call.call_count, 1)
        self.assertEqual(r['total_cases'], 2)
        self.assertEqual(r['accuracy'], 0)
        self.assertEqual(r['recall_no_response'], 0)
        self.assertIsNone(r['avg_api_time_seconds'])
        self.assertEqual(r['quality_bar_status'], 'failed')
        self.assertFalse(r['complete'])

    def test_malformed_response_is_not_a_classification(self):
        self.label()
        call = Mock(return_value={'results': [{'id': 'A', 'label': 'resolved'}]})
        run = self.run_eval(call=call)
        self.assertEqual(run['summary']['successful_cases'], 0)
        self.assertTrue(all(row['status'] == 'error' for row in run['cases']))

    def test_interruption_retains_previous_batch_and_resume_only_pending(self):
        self.csv.write_text('msg_id,content\n' + ''.join(f'Q{i},Question {i}\n' for i in range(8)))
        E.save(self.golden, {'cases': [{'msg_id': f'Q{i}', 'human_label': 'other'} for i in range(8)]})
        self.manifest, _ = E.prepare(self.csv, self.golden, {'guild': '', 'day': '', 'channel': ''})
        self.label()
        calls = []
        def interrupt(convs, scope, model):
            calls.append(convs)
            if len(calls) == 2:
                raise KeyboardInterrupt()
            return success(convs, scope, model)
        with self.assertRaises(KeyboardInterrupt):
            self.run_eval(call=interrupt)
        saved = E.read(self.output)
        self.assertEqual(saved['summary']['successful_cases'], 6)
        self.assertIsNone(saved['summary']['accuracy'])
        call = Mock(side_effect=success)
        self.run_eval(resume=True, call=call)
        self.assertEqual(len(call.call_args.args[0]), 2)

    def test_changed_model_labels_source_or_scope_cannot_resume(self):
        self.label()
        self.run_eval()
        with self.assertRaisesRegex(ValueError, 'Output exists'):
            self.run_eval()
        with self.assertRaisesRegex(ValueError, 'Cannot resume'):
            E.execute(self.manifest, self.output, 'test/other', resume=True)
        for changed in ['label', 'scope', 'data']:
            original = copy.deepcopy(self.manifest)
            if changed == 'label': self.manifest['cases'][0]['expected_label'] = 'resolved'
            elif changed == 'scope': self.manifest['scope']['day'] = '2026-09-18'
            else: self.csv.write_text(self.csv.read_text().replace('Question', 'Different question'))
            with self.assertRaises(ValueError):
                self.run_eval(resume=True)
            self.manifest = original

    def test_duplicate_or_missing_result_rows_rejected(self):
        self.label()
        run = self.run_eval()
        run['cases'][1] = run['cases'][0]
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            E.summarize(run)

    def test_current_api_recomputes_report_and_never_calls_provider(self):
        self.run_eval(allow_unreviewed=True)
        with patch.object(server, 'CURRENT_EVALUATION_PATH', self.output), patch.object(analyze.requests, 'post') as post:
            result = server.recorded_evaluation()
        post.assert_not_called()
        self.assertEqual(result['successful_cases'], 2)
        self.assertIsNone(result['accuracy'])

    def test_provider_error_retryability(self):
        convs = list(E.resolve(self.manifest)[1].values())
        for status, retry in [(429, True), (503, True), (401, False), (402, False), (404, False)]:
            response = Mock(status_code=status, text='provider error')
            response.raise_for_status.side_effect = analyze.requests.HTTPError(response=response)
            with patch.object(analyze, 'OPENROUTER_API_KEY', 'test'), patch.object(analyze.requests, 'post', return_value=response), patch.object(T.llm_trace, 'append', return_value=True):
                result = T.triage_conversations(convs, {}, 'test/model')
            self.assertEqual(result['retryable'], retry)
            self.assertEqual(result['http_status'], status)


if __name__ == '__main__':
    unittest.main()
