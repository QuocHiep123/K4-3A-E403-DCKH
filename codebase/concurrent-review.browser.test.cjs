// Review completed conversations during stop/resume and subsequent batch arrivals.
// Provider requests are intercepted; no API credits are used.
const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.argv[4]||'http://127.0.0.1:8085';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();
 const errors=[],requests=[];let review;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',async response=>{if(response.url().endsWith('/api/preview')&&response.ok())review=await response.json();});
 await page.route('**/api/analyze',async route=>{
  const body=route.request().postDataJSON(),source=review;
  let release;const gate=new Promise(resolve=>{release=resolve;});requests.push({body,release});
  await gate;
  const results=body.ids.map(id=>({id,label:'no-response',priority:2,confidence:.9,reasoning:'Needs a reply',needs_ta_review:true,evidence_ids:[source.conversations.find(c=>c.id===id).messages[0].msg_id]}));
  try{await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,mode:'live',model:body.model,fingerprint:source.fingerprint,results})});}catch{} // Stopped browser requests are deliberately aborted.
 });
 async function requestAt(index){
  const until=Date.now()+5000;while(requests.length<=index){if(Date.now()>until)throw Error('Expected batch '+index);await new Promise(resolve=>setTimeout(resolve,20));}
  return requests[index];
 }
 async function select(id){await page.locator('#viewAll').click();await page.locator(`[data-id="${id}"]`).click();}
 async function assertDraft(id,note){
  assert.match(await page.locator('#caseMeta').innerText(),new RegExp(id));
  assert.equal(await page.locator('#sourceReviewed').isChecked(),true);
  assert.equal(await page.locator('#decisionNote').inputValue(),note);
 }
 try{
  await page.goto(base);await page.locator('#modelSelect').selectOption('nvidia/nemotron-3-ultra-550b-a55b:free');
  await page.locator('#sourceCsv').click();
  const csv='msg_id,content\n'+Array.from({length:18},(_,i)=>`R${String(i+1).padStart(2,'0')},Question ${i+1}`).join('\n');
  await page.locator('#csvFile').setInputFiles({name:'concurrent-review.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.locator('#loadCsv').click();await page.locator('#analyzeBtn').click();
  const first=await requestAt(0);first.release();await requestAt(1);
  const ready=first.body.ids[0],pending=requests[1].body.ids[0];
  await select(ready);assert.equal(await page.locator('#sourceReviewed').isEnabled(),true);
  await page.getByText('Tôi đã đọc và kiểm tra các tin nguồn',{exact:true}).click();
  const note='Keep this draft while other batches arrive.';
  await page.locator('#decisionNote').fill(note);await page.locator('#taDecision').selectOption('responded-unclear');
  await page.locator('#stopBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);
  requests[1].release();await assertDraft(ready,note);
  await page.locator('#analyzeBtn').click();const resumed=await requestAt(2);
  assert.equal(await page.locator('#sourceReviewed').isEnabled(),true);
  assert.equal(await page.locator('#saveDecision').isEnabled(),true);
  assert.equal(await page.locator('#modelSelect').isDisabled(),true);
  await select(pending);assert.equal(await page.locator('#decisionArea').isHidden(),true);assert.equal(await page.locator('#sourceReviewed').isDisabled(),true);
  await select(ready);await assertDraft(ready,note);
  await page.locator('#decisionNote').focus();await page.locator('#decisionNote').evaluate(el=>el.setSelectionRange(5,5));
  resumed.release();await requestAt(3);
  await page.waitForFunction(()=>document.getElementById('analysisProgress').value===12);
  await assertDraft(ready,note);assert.equal(await page.locator('#taDecision').inputValue(),'responded-unclear');
  assert.equal(await page.locator('#decisionNote').evaluate(el=>document.activeElement===el&&el.selectionStart===5),true);
  await page.locator('#saveDecision').click();assert.equal(await page.locator('#finalCount').innerText(),'1/5');
  assert.match(await page.locator('#decisionStatus').innerText(),/Đã lưu/);assert.equal(await page.locator('#stopBtn').isVisible(),true);
  const secondReady=resumed.body.ids[0];await select(secondReady);await page.locator('#sourceReviewed').check();
  const secondNote='Unsaved note survives the final batch.';await page.locator('#decisionNote').fill(secondNote);
  requests[3].release();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);
  await assertDraft(secondReady,secondNote);assert.equal(await page.locator('#viewAll').getAttribute('aria-pressed'),'true');
  const downloading=page.waitForEvent('download');await page.locator('#exportBtn').click();
  const output=JSON.parse(await fs.readFile(await (await downloading).path(),'utf8'));
  assert.equal(output.coverage.analyzed,18);assert.equal(output.decisions.length,1);
  assert.equal(output.decisions[0].id,ready);assert.equal(output.decisions[0].note,note);assert.equal(output.decisions[0].decision,'responded-unclear');
  assert.equal(output.decisions[0].audit.length,1);
  await page.locator('#modelSelect').selectOption('google/gemini-3.8-flash');
  assert.equal(await page.locator('#decisionArea').isHidden(),true);assert.equal(await page.locator('#sourceReviewed').isChecked(),false);assert.equal(await page.locator('#decisionNote').inputValue(),'');
  assert.deepEqual(errors,[]);
  console.log('PASS: completed cases reviewable during analysis/resume; pending cases gated; drafts, focus, selection and saved decisions survive incoming/final batches; model changes isolate drafts.');
 }finally{for(const request of requests)request.release();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
