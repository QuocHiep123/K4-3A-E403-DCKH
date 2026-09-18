// End-to-end: actual import/preview APIs, new CSV/paste inputs, intercepted AI only.
// node codebase/dashboard.browser.test.cjs /path/to/playwright /path/to/browser [base-url]
const {chromium}=require(process.argv[2]||'playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');
const base=process.argv[4]||'http://127.0.0.1:8082';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const context=await browser.newContext({viewport:{width:1512,height:1100},acceptDownloads:true});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let review,mode='partial',calls=0;
 page.on('response',async response=>{if(response.url().endsWith('/api/preview')&&response.status()===200)review=await response.json();});
 await page.route('**/api/analyze',async route=>{
  calls++;const body=route.request().postDataJSON();await new Promise(resolve=>setTimeout(resolve,180));
  if(mode==='expired')return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({success:false,message:'Phiên dữ liệu đã hết hạn. Hãy nhập lại dữ liệu.'})});
  if(mode==='partial'&&body.ids.includes('J1'))return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({success:false,message:'Provider temporarily unavailable'})});
  if(mode==='offline')return route.abort('failed');
  const results=body.ids.map(id=>{const c=review.conversations.find(c=>c.id===id);const label=id==='J8'?'other':id==='J7'?'resolved':'no-response';return{id,label,priority:['resolved','other'].includes(label)?0:id==='J6'?3:2,confidence:.81,reasoning:'Observed support need <img src=x onerror=alert(1)>',evidence_ids:[mode==='invalid'?'MISSING':c.messages[0].msg_id],needs_ta_review:true};});
  assert.match(body.model,/^[\w.-]+\/[\w.:-]+$/);
  await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,mode:'live',fingerprint:review.fingerprint,model:body.model,latency_seconds:1.5,request_id:'test-request',results})});
 });
 const checks=[];
 const csv='msg_id,content,reply_to,created_at_vn,guild,channel,author,is_bot,n_attachments\n'+Array.from({length:8},(_,i)=>`J${i+1},Judge question ${i+1},,2026-09-18 10:0${i},Judge,help,user-${i},False,0`).join('\n');
 async function waitLoaded(){await page.waitForFunction(()=>document.getElementById('loadCsv').disabled===false);}
 async function upload(text,name='judge.csv') {await page.locator('#sourceCsv').click();await page.locator('#csvFile').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(text)});await page.locator('#loadCsv').click();await waitLoaded();}
 async function analyze(){await page.locator('#analyzeBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);}
 try{
  await page.goto(base);
  await upload('content\nmissing id');assert.match(await page.locator('#inputStatus').innerText(),/Thiếu cột/);assert.equal(calls,0);assert.equal(await page.locator('#reviewSection').isHidden(),true);
  checks.push('Invalid CSV has actionable errors and never calls AI');
  await upload(csv);assert.equal(await page.locator('.case-button').count(),8);assert.match(await page.locator('#scopeSummary').innerText(),/8 hội thoại/);assert.equal(calls,0);
  checks.push('Previously unseen CSV loads and previews all eight conversations before AI');
  await analyze();assert.match(await page.locator('#analysisStatus').innerText(),/6\/8/);assert.match(await page.locator('#analysisStatus').innerText(),/tạm thời/);
  assert.equal(await page.locator('#retryBtn').isVisible(),true);assert.equal(calls,2);
  mode='success';await page.locator('#retryBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);
  assert.match(await page.locator('#analysisStatus').innerText(),/8\/8/);assert.equal(calls,3);assert.equal(await page.locator('.case-button').count(),5);
  assert.equal(await page.locator('.case-button').first().getAttribute('data-id'),'J6');assert.equal(await page.locator('[data-id="J7"]').count(),0);
  checks.push('Partial batch failure remains visible; retry only failed cases; top five computed across all results');
  assert.equal(await page.locator('#aiReason img').count(),0);assert.match(await page.locator('#aiReason').innerText(),/Observed support need/);
  assert.equal(await page.locator('#saveDecision').isDisabled(),true);await page.locator('#sourceReviewed').check();await page.locator('#saveDecision').click();assert.match(await page.locator('#toast').innerText(),/Thêm lý do/);
  await page.locator('#decisionNote').fill('Check the blocker with the student.');await page.locator('#saveDecision').click();assert.match(await page.locator('#finalCount').innerText(),/1\/5/);
  await page.locator('#sourceReviewed').check();await page.locator('#taDecision').selectOption('resolved');await page.locator('#decisionNote').fill('Confirmed resolved.');await page.locator('#saveDecision').click();assert.match(await page.locator('#finalCount').innerText(),/0\/5/);
  await page.locator('#viewAll').click();await page.locator('[data-id="J5"]').click();await page.locator('#sourceReviewed').check();await page.locator('#decisionNote').fill('Replace the resolved suggestion.');await page.locator('#saveDecision').click();assert.match(await page.locator('#finalList').innerText(),/J5/);
  const downloadPending=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadPending;const output=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.deepEqual(output.followUp,['J5']);assert.equal(output.coverage.analyzed,8);assert.equal(output.decisions.find(r=>r.id==='J6').result.label,'no-response');assert.equal(output.decisions.find(r=>r.id==='J6').decision,'resolved');assert.equal(output.sentToDiscord,false);
  checks.push('Source gate, rationale, corrections, replacements and export preserve original AI and audit');
  await page.reload();await upload(csv);assert.match(await page.locator('#finalList').innerText(),/J5/);assert.equal(calls,3);
  checks.push('Reimporting identical data after reload restores decisions without new AI calls');
  const originalModel=await page.locator('#modelSelect').inputValue();
  await page.locator('#modelSelect').selectOption('google/gemini-3.8-flash');
  assert.match(await page.locator('#finalCount').innerText(),/0\/5/);assert.equal(await page.locator('#decisionArea').isHidden(),true);assert.equal(calls,3);
  await page.locator('#analyzeBtn').click();assert.equal(await page.locator('#modelSelect').isDisabled(),true);await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);
  assert.equal(calls,5);assert.match(await page.locator('#aiMetrics').innerText(),/google\/gemini-3.8-flash/);
  await page.locator('#sourceReviewed').check();await page.locator('#decisionNote').fill('Independent Gemini review.');await page.locator('#saveDecision').click();assert.match(await page.locator('#finalList').innerText(),/J6/);
  await page.reload();await upload(csv);assert.equal(await page.locator('#modelSelect').inputValue(),'google/gemini-3.8-flash');assert.match(await page.locator('#finalList').innerText(),/J6/);assert.equal(calls,5);
  await page.locator('#modelSelect').selectOption(originalModel);assert.match(await page.locator('#finalList').innerText(),/J5/);assert.equal(calls,5);
  await page.locator('#modelSelect').selectOption('custom');await page.locator('#customModel').fill('bad model');await page.locator('#customModel').press('Tab');assert.match(await page.locator('#modelStatus').innerText(),/provider\/model-id/);assert.equal(await page.locator('#analyzeBtn').isDisabled(),true);
  await page.locator('#customModel').fill('example/new-model');await page.locator('#customModel').press('Enter');assert.equal(await page.locator('#analyzeBtn').isEnabled(),true);assert.match(await page.locator('#finalCount').innerText(),/0\/5/);
  await analyze();assert.match(await page.locator('#aiMetrics').innerText(),/example\/new-model/);
  await page.locator('#modelSelect').selectOption(originalModel);assert.match(await page.locator('#finalList').innerText(),/J5/);
  checks.push('Model is sent per request; changing model reruns all input, isolates decisions, restores caches and persists selection; custom IDs validated');
  await page.locator('#sourcePaste').click();await page.locator('#pasteText').fill('New judge: unexpected question\nResponder: what happened?');await page.locator('#loadPaste').click();await waitLoaded();assert.match(await page.locator('#finalCount').innerText(),/0\/5/);
  mode='invalid';await analyze();assert.match(await page.locator('#analysisStatus').innerText(),/0\/1/);assert.equal(await page.locator('#decisionArea').isHidden(),true);
  mode='success';await page.locator('#retryBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);assert.match(await page.locator('#messages').innerText(),/unexpected question/);
  checks.push('Pasted judge input gets independent analysis; fabricated evidence is rejected, then retry succeeds');
  await page.locator('#sourceBundled').click();await page.locator('#loadBundled').click();await waitLoaded();assert.match(await page.locator('#inputStatus').innerText(),/1092/);assert.match(await page.locator('#scopeSummary').innerText(),/232 hội thoại/);
  await page.locator('#channelFilter').selectOption('channel_11');assert.equal(await page.locator('#analysisSection').isHidden(),true);await page.locator('#previewBtn').click();await waitLoaded();await page.locator('[data-id="M05023"]').click();assert.equal(await page.locator('[data-message-id="M13539"]').count(),1);
  checks.push('Bundled real data loads; filters invalidate old scope; M05023 includes its actual reply');
  mode='expired';await upload(csv.replaceAll('Judge question','Expired session question'));const beforeExpiry=calls;await analyze();assert.equal(calls-beforeExpiry,1);assert.match(await page.locator('#analysisStatus').innerText(),/0\/8/);
  checks.push('Expired review stops after one failed batch instead of sending the rest');
  mode='success';await upload(csv.replaceAll('Judge question','Stop test question'));const beforeStop=calls;await page.locator('#analyzeBtn').click();await page.locator('#stopBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);assert.equal(calls-beforeStop,1);assert.match(await page.locator('#analysisStatus').innerText(),/6\/8/);await analyze();assert.match(await page.locator('#analysisStatus').innerText(),/8\/8/);
  checks.push('Stop preserves completed batches; continue runs only remaining conversations');
  // Return to synthetic judge input for screenshots; no private course text in artifacts.
  await upload(csv);await page.locator('#viewTop').click();await page.locator('[data-id="J6"]').click();await page.evaluate(()=>window.scrollTo(0,0));
  await fs.mkdir('/tmp/discord-pulse-workflow-qa',{recursive:true});await page.screenshot({path:'/tmp/discord-pulse-workflow-qa/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/discord-pulse-workflow-qa/mobile.png',fullPage:true});
  checks.push('Desktop and mobile 390px render without horizontal overflow');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
