# Evaluation — Discord Pulse

The current evaluator uses the same conversation assembly, date cutoff, five-label prompt,
batch limits and response validator as the dashboard. It reads `data/discord-pack/k4_messages.csv`.
It never trains a model, invents a fallback classification, or sends Discord messages.

## Prepare the inputs and human labels (offline)

From the repository root:

```bash
.venv/bin/python -m codebase.evaluate prepare
```

This creates two local, Git-ignored files:

- `eval/local/review.md`: complete source conversations, warnings and possible duplicate-ID matches.
- `eval/local/review.json`: source selections and blank human annotations.

Read the worksheet, then edit each case in `review.json`:

```json
{
  "source_id": "M05023",
  "expected_label": "responded-unclear",
  "reviewed_by": "Name of the person who checked the source",
  "evidence_ids": ["M05023", "M13539"]
}
```

Keep the other generated fields. Use one of `no-response`, `responded-unclear`, `resolved`,
`needs-context`, or `other`. Label the **whole visible conversation**, not just the selected
message. A diagnostic reply is not proof of resolution; do not infer attachment contents.
`support-request` is a message category, not a supported conversation status.
Do not use model predictions as ground truth. Review and freeze labels before the scored run.

The original 20-case list currently gives **18 unique inputs and two ambiguous IDs**, `M80709`
and `M88243`. For those cases, read both candidates and explicitly choose a suffixed
`source_id` such as `M80709#1` or `M80709#2`. Several legacy descriptions also disagree with
the source, so **all labels need review**, even labels previously marked `ta_reviewed`.
If no candidate represents the intended test, correct the case list and prepare a new set.
The evaluator never selects an ambiguous candidate automatically or counts the same
conversation twice.

Optional scope flags: `--guild`, `--day YYYY-MM-DD`, `--channel`.
A day scope includes earlier replies/parents but excludes future messages, exactly like the dashboard.
Use `--review eval/local/new-review.json` to prepare another set without overwriting annotations.

## Run and resume

Configure `OPENROUTER_API_KEY` in `.env`, then run:

```bash
.venv/bin/python -m codebase.evaluate run --model google/gemini-3.8-flash
```

Any valid OpenRouter `provider/model` ID is supported. Paid models consume account credits.
The default is `OPENROUTER_MODEL` from `.env`. Inputs are bounded batches of up to six complete
conversations, not the whole CSV. Evaluation batches run sequentially for clear timing.

Every completed API attempt is saved atomically to `eval/local/current_run.json`, including
failures, timings, model/request IDs and trace IDs. Temporary connection errors, timeouts,
HTTP 429 and 5xx responses retry with bounded backoff (`--max-attempts`, default 3).
Authentication/credit/model errors stop the run; successful batches stay saved. Full provider
prompt/response traces remain in `logs/llm-requests.log` with credentials redacted.

After an interruption or provider failure:

```bash
.venv/bin/python -m codebase.evaluate run --model google/gemini-3.8-flash --resume
```

Resume skips valid completed cases and retries outstanding cases. It refuses to mix models,
changed labels, changed source data/scope, or different pipeline implementations. Use a new
`--output eval/local/run-NAME.json` for such changes. Existing files are never overwritten by
a fresh run. To replace the dashboard's default run, first archive the old file under another
name, then run with the default output path.

For a diagnostic run before labeling is complete:

```bash
.venv/bin/python -m codebase.evaluate run --model google/gemini-3.8-flash --allow-unreviewed
```

This permits inference on unambiguous inputs, preserves ambiguous/missing inputs as explicit
errors, and **does not publish accuracy or recall without reviewed labels**. It is not a
quality benchmark. Preparing labels afterward requires a new run; no retroactive editing of
expected answers to match predictions.

## Read results and check citations

```bash
.venv/bin/python -m codebase.evaluate report
.venv/bin/python -m codebase.evaluate citations
```

The second command creates `eval/local/citation-review.json` with each prediction and its
source messages. A person must set `supported` to `true` or `false`, fill in `reviewed_by`,
and optionally add a note. Check whether the cited text actually supports the reasoning,
not just whether the IDs exist. Import those checks:

```bash
.venv/bin/python -m codebase.evaluate report --citations eval/local/citation-review.json
```

Both commands accept `--run` for a different result file. Citation reviews are bound to the
run and the exact prediction; changed predictions invalidate prior checks.

Restart the dashboard server after code changes. **Xem lượt kiểm thử đã lưu** (`GET /api/eval`)
reads the current default run and recomputes metrics, without calling the model. If no new
run exists it explicitly falls back to the historical three-case artifact. Generated source
worksheets and provider outputs are local-only and cannot be served as static files.

## What the metrics mean

| Metric | Required threshold | Reporting rule |
|---|---|---|
| Accuracy | ≥70% | Correct status / all expected cases, only after every input has a reviewed label and every case has been attempted. API/parse failures count as misses. |
| Recall of `no-response` | ≥90% | Correct `no-response` predictions / all human-labeled `no-response` cases. No positive examples means undefined, not 100%. |
| Citation validity | ≥95% | Human-confirmed supported predictions / all expected cases; unknown until every case is checked. ID validation alone is insufficient. |
| Average API time | ≤5 s/case | Sum of request durations, including failed attempts, divided by all cases, once all have valid results. Mean batch request duration is reported separately. This is not single-request latency or end-to-end user time. |
| TA completion | ≤5 minutes | Requires a separate timed user session. Not measured by this evaluator. |

Unrun cases are not dropped from denominators. Unreviewed labels and missing inputs keep
accuracy/recall unavailable. Valid model output, passing code tests, and synthetic smoke tests
do not establish AI quality. The overall quality bar cannot pass while required evidence is
missing. Grouping quality needs a separate evaluation; this set measures classification.

## Historical artifacts

`golden_set.json`, `golden_set_results.json` and `cp3_test_results.json` are preserved as
historical evidence, not overwritten. The saved three-case run contains one API error and
two valid but mismatched predictions. Notes claiming an earlier 20-case score cannot be
verified from those three rows. Historical five-case results are not a current 20-case benchmark.

`codebase/analyze.py` retains the old demo classifier for compatibility, but its CLI now delegates
to this evaluator. Its old single-message benchmark, hardcoded labels and automatic webhook
report have been removed.

Offline regression tests:

```bash
.venv/bin/python -m unittest codebase.evaluation_test codebase.workflow_test codebase.dashboard_backend_test codebase.grouping_test
```
