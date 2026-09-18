(function(root){
  'use strict';
  function candidates(conversations, records){
    return conversations.filter(c=>!c.blocked && records[c.id]?.result && (records[c.id].decision||records[c.id].result.label)==='no-response');
  }
  function validGroups(groups, conversations){
    if(!Array.isArray(groups)||groups.length>20)return false;
    const lookup=new Map(conversations.map(c=>[c.id,new Set(c.messages.map(m=>m.msg_id))]));
    const seen=new Set(),groupIds=new Set();
    return groups.every(g=>{
      if(!g||typeof g.id!=='string'||!g.id||groupIds.has(g.id))return false;
      groupIds.add(g.id);
      for(const [key,limit] of [['title',160],['question',500],['reasoning',1000]])if(typeof g[key]!=='string'||!g[key].trim()||g[key].length>limit)return false;
      return Array.isArray(g.members)&&g.members.length>=2&&g.members.length<=20&&g.members.every(m=>{
        if(!m||!lookup.has(m.id)||seen.has(m.id)||!Array.isArray(m.evidence_ids)||m.evidence_ids.length<1||m.evidence_ids.length>3||!m.evidence_ids.every(id=>lookup.get(m.id).has(id)))return false;
        seen.add(m.id);return true;
      });
    });
  }
  function initial(group){return {included:group.members.map(m=>m.id),seen:[],confirmed:false,dismissed:false,reply:'',audit:[]};}
  function changeMembers(group,review,ids){
    if(new Set(ids).size!==ids.length||ids.some(id=>!group.members.some(m=>m.id===id)))throw new Error('Thành viên không thuộc nhóm gợi ý.');
    return {...review,included:ids,confirmed:false,confirmed_at:null,audit:[...review.audit,{at:new Date().toISOString(),action:'members_changed',included:ids}]};
  }
  function confirm(group,review,approved){
    if(!approved)throw new Error('Xác nhận đây là câu hỏi chung với cùng một câu trả lời.');
    if(review.dismissed||review.included.length<2)throw new Error('Cần giữ ít nhất 2 hội thoại trong nhóm.');
    if(review.included.some(id=>!review.seen.includes(id)))throw new Error('Mở và đọc nguồn của từng hội thoại được giữ trong nhóm.');
    const at=new Date().toISOString();
    return {...review,confirmed:true,confirmed_at:at,audit:[...review.audit,{at,action:'confirmed',included:[...review.included]}]};
  }
  function restore(group,review){
    const fresh=initial(group),ids=new Set(fresh.included);
    if(!review||!Array.isArray(review.included)||new Set(review.included).size!==review.included.length||review.included.some(id=>!ids.has(id))||!Array.isArray(review.seen)||review.seen.some(id=>!ids.has(id))||typeof review.reply!=='string'||review.reply.length>5000||!Array.isArray(review.audit))return fresh;
    const confirmed=review.confirmed===true&&!review.dismissed&&review.included.length>=2&&review.included.every(id=>review.seen.includes(id));
    return {...review,confirmed,dismissed:review.dismissed===true};
  }
  const api={candidates,validGroups,initial,changeMembers,confirm,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PulseQuestionGroups=api;
})(typeof window==='undefined'?{}:window);
