import copy
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from codebase import workflow, question_groups as G, analyze, llm_trace
import server

CSV = '''msg_id,content,guild,channel,created_at_vn
A1,When is assignment 2 for class K4 due?,K4,help,2026-09-18 10:00
A2,What is the deadline for class K4 assignment 2?,K4,help,2026-09-18 10:01
P1,My account cannot access the lab.,K4,help,2026-09-18 10:02
'''


class GroupingTests(unittest.TestCase):
    def setUp(self):
        data = workflow.import_data({'source': 'csv', 'text': CSV})
        self.review = workflow.preview({'dataset_id': data['dataset_id']})
        self.cases = self.review['conversations']
        self.group = {'title': 'Assignment 2 deadline', 'question': 'When is class K4 assignment 2 due?',
                      'reasoning': 'Same assignment and class; the deadline applies to everyone.',
                      'members': [{'id': 'A1', 'evidence_ids': ['A1']}, {'id': 'A2', 'evidence_ids': ['A2']}]}

    def test_groups_allow_ungrouped_personal_questions_and_empty_result(self):
        groups = G.validate_groups({'groups': [self.group]}, self.cases)
        self.assertEqual([m['id'] for m in groups[0]['members']], ['A1', 'A2'])
        self.assertEqual(G.validate_groups({'groups': []}, self.cases), [])
        self.assertEqual(groups[0]['id'], G.validate_groups({'groups': [self.group]}, list(reversed(self.cases)))[0]['id'])

    def test_rejects_unknown_members_duplicate_members_and_cross_conversation_evidence(self):
        for changes in [[{'id': 'FOREIGN', 'evidence_ids': ['FOREIGN']}, self.group['members'][1]],
                        [self.group['members'][0]] * 2,
                        [{'id': 'A1', 'evidence_ids': ['A2']}, self.group['members'][1]],
                        [self.group['members'][0]]]:
            with self.assertRaises(ValueError): G.validate_groups({'groups': [{**self.group, 'members': changes}]}, self.cases)
        with self.assertRaises(ValueError): G.validate_groups({'groups': [self.group, self.group]}, self.cases)
        with self.assertRaises(ValueError): G.validate_groups({'groups': [{**self.group, 'question': 'x' * 501}]}, self.cases)

    def test_group_input_uses_preview_and_rejects_foreign_oversized_input(self):
        _, cases = workflow.grouping_input({'review_id': self.review['review_id'], 'ids': ['A1', 'A2'], 'content': 'replacement'})
        self.assertIn('assignment 2', cases[0]['messages'][0]['content'])
        for ids in [[], ['A1'], ['A1', 'A1'], ['A1', 'FOREIGN'], ['A1'] * 81]:
            with self.assertRaises(ValueError): workflow.grouping_input({'review_id': self.review['review_id'], 'ids': ids})
        oversized = copy.deepcopy(self.review)
        for c in oversized['conversations']: c['messages'][0]['content'] = 'x' * 31000
        key = workflow.put(workflow.PREVIEWS, oversized, 24)
        with self.assertRaises(ValueError): workflow.grouping_input({'review_id': key, 'ids': ['A1', 'A2']})

    def test_group_request_is_traced_and_does_not_invent_an_answer(self):
        payload = {'id': 'group-provider-id', 'choices': [{'message': {'content': json.dumps({'groups': [self.group]})}}]}
        response = Mock(status_code=200, text=json.dumps(payload)); response.json.return_value = payload
        with tempfile.TemporaryDirectory() as tmp, patch.object(llm_trace, 'TRACE_PATH', Path(tmp) / 'trace.log'), patch.object(analyze, 'OPENROUTER_API_KEY', 'secret-key'), patch.object(analyze.requests, 'post', return_value=response) as post:
            output = G.suggest_groups(self.cases, self.review['scope'], 'google/gemini-3.8-flash')
            traces = [json.loads(line) for line in llm_trace.TRACE_PATH.read_text().splitlines()]
        request = post.call_args.kwargs['json']
        self.assertEqual(request['model'], 'google/gemini-3.8-flash')
        self.assertEqual(json.loads(request['messages'][1]['content'])['conversations'][0]['channel'], 'help')
        self.assertIn('Không viết câu trả lời', request['messages'][0]['content'])
        self.assertEqual(traces[0]['task'], 'question_groups')
        self.assertEqual(output['request_id'], 'group-provider-id')
        self.assertNotIn('reply', output['groups'][0])

    def test_group_api_returns_validated_groups_from_authoritative_preview(self):
        raw = json.dumps({'review_id': self.review['review_id'], 'ids': ['A1', 'A2'], 'model': 'google/gemini-3.8-flash'}).encode()
        handler = object.__new__(server.PulseRequestHandler)
        handler.path = '/api/groups'; handler.headers = {'Content-Length': str(len(raw))}; handler.rfile = io.BytesIO(raw)
        responses = []; handler.send_json = lambda status, data: responses.append((status, data))
        with patch.object(server, 'suggest_groups', return_value={'groups': G.validate_groups({'groups': [self.group]}, self.cases)}) as suggest:
            handler.do_POST()
        self.assertEqual(responses[0][0], 200)
        self.assertEqual(responses[0][1]['fingerprint'], self.review['fingerprint'])
        self.assertEqual([c['id'] for c in suggest.call_args.args[0]], ['A1', 'A2'])
        self.assertEqual(suggest.call_args.kwargs['model'], 'google/gemini-3.8-flash')


if __name__ == '__main__': unittest.main()
