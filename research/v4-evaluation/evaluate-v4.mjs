// Offline evaluation only. Do not import into production, prompts, or retrieval.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'../v4-runs/comparison-20261025-1209/v4');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const grades={
 S0:[['E','明确当前两模型名称和版本，中文表格列头完整。'],['E','1M上下文与384K最大输出分清，未相互偷换。'],['E','区分当前官方模型表与报道当时V3.2 API的128K，明确第三方转述与时间/对象差异。']],
 S1:[['F','遗漏已选READ的2026停用公告，仅给2025Terminus映射且未注明其日期；当前状态未答。'],['L','第三方页面64K有准确限定的间接价值，官方目标规格仍未知。'],['L','第三方页面最大8K有准确限定的间接价值，未给官方默认值/条件，不算当前规格覆盖。'],['L','第三方三类美元/百万tokens价格齐全且明确非官方；官方当前目标价格未知。'],['F','未利用已选b112停用公告的明确日期，旧Terminus映射只泛称不同时间，没有建立必要时效链。']],
 S2:[['F','最终未明确回答计划/日期范围，只有泛化无结论文本。'],['F','已有SUPPORTED官方每月2000次补全却未发布，最终遗漏。'],['F','已有官方月度AI credits与Free限定却未发布，最终遗漏。'],['F','计量边界未在最终答案呈现，账本支持不算用户答案。'],['F','已有免费计划超额升级Pro的SUPPORTED原句却未发布，最终遗漏。']],
 S3:[['U','最终明确保留官方声明与范围未核实；已读取官方独立完成任务等原句，核查全失败，属于可用信息未交付。'],['U','确实搜索并读HN，但最终仅保留HN实际报告未知，没有可用任务/过程/结果。'],['F','最终没有单独处理支持/成功案例及相应寻找结果。'],['F','失败/人工介入子任务在账本但最终未明确呈现，未交付已有演示批评的限定信息。'],['U','最终明确HN对独立完成任务的证据未核实，没有建立比较结论。']],
 S4:[['E','准确提供2024-12-18首发原句和2025-02-26后续公告的历史政策线索；未声称已穷尽互联网最早。'],['E','列出实际已保存源及原句，局部无50次的观察有范围。'],['U','无法确认具体中文报道的转载链；没有以不同域名硬判独立。'],['E','明确两官方公告同一政策体系，不是多次独立验证，指出历史50条与当前credits口径差异需区分。']],
 S5:[['L','区分Cursor写Blender脚本及Blender4.3.2的任务条件；底层GPT与MCP只来自另一报道转述，不是该原作者实验全栈规格。'],['L','原作者小球弹跳脚本的提示、版本麻烦及最终动画均有原句，限于一次实验。'],['F','实际取得FreeCAD相关原句但最终未给CAD评价或明确CAD方向缺口，泛称总题未知不足。'],['L','最终动画为可定位的个案成功，未泛化CAD/工业可靠性。'],['L','明确Blender版本相关麻烦后完成，支持该案例限制；其他一般性限制未完成。'],['F','同一报道一词把2025Atomic Object实验与2026AGI Hunt转述混连；未提供来源家族/一手二手清楚分组。'],['F','虽给个案限定、推荐门槛，但没明示CAD未核实，泛化总题未知不能覆盖两个方向的边界。']],
 S6:[['F','没有明确列出GitHub与Microsoft消费者Copilot歧义，也未澄清；泛称不能跨所有产品不等于识别候选。'],['F','开头将镜像50条合称GitHub文档直接答案，未并列消费者产品当前机制或完成澄清；2025条目不能确定当前。'],['L','明确历史Terminal范围、补全与对话区别、credits不能自行换算并提醒不能跨所有产品统一；边界有有限价值，仍未补足产品选择。']],
 S7:[['E','实际知乎定向搜索且尝试5个知乎URL均403，有真实记录。'],['F','没有知乎可读原句；正文直接给guijiagi.com评测结论，未明确它不是知乎评价/仅补充。'],['F','正文任务层次差异来自非知乎评测；没有交代知乎样本范围与评价分歧未知，不能替代指定站点字段。'],['F','只在后方列403技术日志，正文未明确知乎来源未完成，也未把guijiagi.com识别为站外补充。']],
 S8:[]
};
const findings=[
 ['S1','major','关键公告已进入READ证据40495ace-e1ea-4a4b-b0a2-49f3643a61c3，doc64ab8662...,b112,[4758,4879)，故遗漏位置已从读取选择后移至核查/综合/预算。'],
 ['S1','minor','美元/人民币价格引文缺模型名列头，答案明确说明未完整显示对应模型名，没有把数值套给deepseek-chat；仍不构成满足目标当前规格。'],
 ['S2','critical','父任务audit标3/3SUPPORTED，9项claims有支持，最终却无一个事实段；semanticChecks三段均未完成/输出无效，被隔离。账本覆盖不能代替最终用户覆盖。'],
 ['S3','major','已读取Cognition独立完成任务、复杂工程计划与HN评论；批核查结构失败/预算耗尽后全无事实输出。没有清空原始存档，但未达到隔离故障仍保留可用用户结论的目标。'],
 ['S4','positive','取得GitHub2024首发正文，避免v3作者简介盲区，并清楚区别历史政策、同官方上游和当前credits。仍没有实证转载链。'],
 ['S5','major','第三段同一报道承接Atomic Object，却引用AGI Hunt2026-07-12的GPT-5.6 Sol/MCP转述；两个来源/时间/实验不能无提示接成同一实测。'],
 ['S5','positive','真实运行recommendation.independentReports=1且sites含spin.atomicobject.com，证明新元数据路径能实际建立一组报告；未达3组/2站，eligible=false合理。不构成跨站指纹防转载测试。'],
 ['S5','major','FreeCAD使用者六个月经历与fillet偏题原句已读，但核查未完成，最终没说明CAD缺口。不能将泛称总题未核实视为逐方向覆盖。'],
 ['S6','major','GitHub官方当前片段只支持2000补全/credits，50聊天来自githubdocs.cn镜像与2025changelog；开头合称GitHub文档含镜像、给直接50条答案会掩盖来源/时效。'],
 ['S6','minor','每credit0.01美元原句明确共享enterprise pool；答案也写共享企业池，未直接套Free收费，但对用户原问题无帮助，不能当Free超额条款。'],
 ['S7','major','正文40-60%开发时间、30-50%净节省、2-4次自调试等全来自guijiagi.com，未明确站外补充且没有知乎成功读取；仅列403日志不能替代范围告知。'],
 ['S7','major','复杂并发/深层架构成功率下降有原句，但“常规任务相对可靠”为额外概括，所引片段未给成功率/样本/任务层定义；不得将其泛化成知乎开发者共识。'],
 ['S8','positive','正确范围路由，0搜索/0读取/0引用，仅1次规划模型调用626输入25输出，不把创作请求当事实未知。']
];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const cases=[];
for(const cid of Object.keys(grades)){
 const parent=path.join(root,cid);if(!fs.existsSync(parent))continue;
 const sub=fs.readdirSync(parent).find(n=>fs.existsSync(path.join(parent,n,'snapshot-response.json')));if(!sub)continue;
 const d=path.join(parent,sub),r=JSON.parse(fs.readFileSync(path.join(d,'snapshot-response.json'),'utf8')),s=r.snapshot;
 const iv=JSON.parse(fs.readFileSync(path.join(d,'investigation.json'),'utf8')).detail.investigation;
 const v=JSON.parse(fs.readFileSync(path.join(d,'validation.json'),'utf8'));
 const docs=new Map(),documentChecks=[];
 for(const dn of fs.existsSync(path.join(d,'documents'))?fs.readdirSync(path.join(d,'documents')):[]){
  const dd=path.join(d,'documents',dn),m=JSON.parse(fs.readFileSync(path.join(dd,'manifest.json'),'utf8'));docs.set(m.id,m);
  const source=fs.readFileSync(path.join(dd,'source.txt'),'utf8');
  documentChecks.push({documentId:m.id,version:m.version,url:m.requestedUrl,status:m.status,sourceEqualsManifest:source===m.text,
   textHash:m.status==='READ'?sha(m.text)===m.textHash:null,rawHash:fs.existsSync(path.join(dd,'raw.bin'))?sha(fs.readFileSync(path.join(dd,'raw.bin')))===m.rawHash:null});
 }
 const evidenceChecks=s.evidence.filter(e=>e.readStatus==='READ').map(e=>{
  const ref=e.documentReference,m=ref&&docs.get(ref.documentId);
  return {evidenceId:e.id,hash:sha(e.originalExcerpt)===e.contentHash,documentVersion:m?.version===ref?.version,
   position:!!m&&m.text.slice(ref.start,ref.end)===e.originalExcerpt,textHash:!!m&&m.textHash===ref.textHash};
 });
 const quoteChecks=r.answers.flatMap(a=>a.citations.flatMap(c=>c.quotes.map(q=>{const e=s.evidence.find(e=>e.id===q.evidenceId);return {marker:c.marker,evidenceId:q.evidenceId,exact:!!e&&e.originalExcerpt===q.originalExcerpt,hash:sha(q.originalExcerpt)===e?.contentHash};})));
 const fields=grades[cid].map(([status,reason],i)=>({id:`${cid}.${i+1}`,status,reason}));
 const counts=Object.fromEntries(['E','L','U','F'].map(k=>[k,fields.filter(f=>f.status===k).length]));
 cases.push({case:cid,question:iv.question,investigationId:iv.id,snapshotId:s.id,status:iv.status,startedAt:iv.startedAt,completedAt:iv.completedAt,durationMs:Date.parse(iv.completedAt)-Date.parse(iv.startedAt),
  fields,counts,ratios:fields.length?{E:counts.E/fields.length,EL:(counts.E+counts.L)/fields.length,U:counts.U/fields.length,F:counts.F/fields.length}:null,
  usability:cid==='S8'?'ROUTING_PASS':cid==='S0'?'PASS':['S4','S5'].includes(cid)?'LIMITED_USEFUL':'FAIL',stopReason:s.research.stopReason,
  routing:cid==='S8'?{pass:true,reason:'AI-product scope message, no search/read/citation; matches declared product policy.'}:null,
  metrics:{...s.research.counts,httpGetRequestsIncludingRedirects:s.research.httpAttempts.filter(x=>x.method==='GET').length,uniqueRequestedUrls:new Set([...docs.values()].map(d=>d.requestedUrl)).size,modelFailures:v.modelCalls.filter(m=>m.outcome!=='SUCCEEDED').length,configuredMoney:null},
  searches:s.retrievalRecords.map(r=>({provider:r.provider,query:r.query,status:r.status})),recommendation:s.research.recommendation,
  documentChecks,evidenceChecks,quoteChecks,semanticChecks:v.semanticChecks,
  answerBody:r.answers.map(a=>a.body).join('\n\n'),
  sources:s.evidence.map(e=>({id:e.id,url:e.sourceUrl,status:e.readStatus,excerpt:e.originalExcerpt,metadata:e.metadata,documentReference:e.documentReference}))});
}
const totals=Object.fromEntries(['E','L','U','F'].map(k=>[k,cases.reduce((n,c)=>n+c.counts[k],0)]));
const result={schemaVersion:'1.0',reviewType:'independent-offline-frozen-fields',reference:'reference-v1.md',generationChainExcluded:true,
 partial:cases.length!==9,unreviewedCases:Object.keys(grades).filter(id=>!cases.some(c=>c.case===id)),manifest,scope:'Saved exports only; no production, DB or Worker mutations. This is frozen 2405e3d batch; later fixes not attributed retroactively.',
 aggregate:{factCases:8,fixedFactDenominator:36,reviewedFields:cases.reduce((n,c)=>n+c.fields.length,0),counts:totals,E:totals.E/36,EL:(totals.E+totals.L)/36,targetAtLeast7Of8Met:false,strictUsefulPasses:cases.filter(c=>c.usability==='PASS').length,routingS8Pass:cases.some(c=>c.case==='S8'&&c.routing?.pass)},
 findings:findings.map(([caseId,severity,description],i)=>({id:`V4-${i+1}`,case:caseId,severity,description})),cases};
fs.writeFileSync(path.join(__dirname,'comparison-v4-review.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:cases.map(c=>({id:c.case,counts:c.counts,metrics:c.metrics})),aggregate:result.aggregate,integrity:{docs:cases.reduce((n,c)=>n+c.documentChecks.length,0),docFailures:cases.flatMap(c=>c.documentChecks).filter(c=>c.sourceEqualsManifest===false||c.textHash===false||c.rawHash===false),evidenceFailures:cases.flatMap(c=>c.evidenceChecks).filter(c=>Object.entries(c).some(([k,v])=>k!=='evidenceId'&&v===false)),quoteFailures:cases.flatMap(c=>c.quoteChecks).filter(q=>!q.exact||!q.hash)}}));
