const test=require('node:test'),assert=require('node:assert/strict'),G=require('./group-model');
const cases=['A','B','C','D'].map(id=>({id,messages:[{msg_id:id}],blocked:false}));
const group={id:'g1',title:'Deadline',question:'Assignment 2 deadline?',reasoning:'Same assignment',members:[{id:'A',evidence_ids:['A']},{id:'B',evidence_ids:['B']},{id:'C',evidence_ids:['C']}]};
test('Only unanswered cases are candidates, with TA decisions taking precedence',()=>{
  const records={A:{result:{label:'no-response'}},B:{result:{label:'no-response'},decision:'resolved'},C:{result:{label:'responded-unclear'}},D:{result:{label:'resolved'},decision:'no-response'}};
  assert.deepEqual(G.candidates(cases,records).map(c=>c.id),['A','D']);
});
test('Groups reject invented evidence and repeated members but permit no groups',()=>{
  assert.ok(G.validGroups([group],cases));assert.ok(G.validGroups([],cases));
  assert.equal(G.validGroups([group, {...group,id:'g2'}],cases),false);
  assert.equal(G.validGroups([{...group,members:[{id:'A',evidence_ids:['B']},group.members[1]]}],cases),false);
});
test('TA confirmation requires reading each retained source and agreeing one answer applies',()=>{
  const review=G.initial(group);assert.throws(()=>G.confirm(group,review,true),/nguồn/);
  assert.throws(()=>G.confirm(group,{...review,seen:['A','B','C']},false),/Xác nhận/);
  const confirmed=G.confirm(group,{...review,seen:['A','B','C']},true);assert.equal(confirmed.confirmed,true);assert.equal(review.confirmed,false);
  const edited=G.changeMembers(group,{...confirmed,reply:'Verified deadline'},['A','B']);assert.equal(edited.confirmed,false);assert.equal(edited.reply,'Verified deadline');
  assert.equal(G.confirm(group,edited,true).confirmed,true);
  assert.throws(()=>G.confirm(group,G.changeMembers(group,confirmed,['A']),true),/ít nhất 2/);
});
test('Restoring malformed or unsafe confirmation cannot unlock the shared reply',()=>{
  assert.equal(G.restore(group,{...G.initial(group),confirmed:true}).confirmed,false);
  assert.deepEqual(G.restore(group,{...G.initial(group),included:['UNKNOWN']}),G.initial(group));
  assert.equal(G.restore(group,{...G.initial(group),seen:['A','B','C'],confirmed:true,dismissed:true}).confirmed,false);
});
