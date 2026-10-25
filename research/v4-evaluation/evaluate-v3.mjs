// Offline evaluation only. Never import this file into the production/generation chain.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../v4-runs/comparison-20261025-1209/v3');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const grades = [
  [
    ['E','明确将答案限定于现行定价页的 deepseek-flash、deepseek-v4-pro。',['45ae9448-0fc5-4376-a249-3448b06c58d0']],
    ['E','中文同一表格保留两模型列头与上下文长度1M，支持数值和单位。',['45ae9448-0fc5-4376-a249-3448b06c58d0']],
    ['E','限定于当前取得的定价页所列模型，明确文档未标日期；没有把搜索摘要中的旧128K当成当前普遍规格。',['45ae9448-0fc5-4376-a249-3448b06c58d0']]
  ],
  [
    ['F','已保存官方2026-07-24停止使用公告，但答案仍以“当前阶段”介绍该日期之前的映射，没有解释本次2026-10-25的状态；不能以历史映射替代当前状态。',['d7e8a41f-835e-46e3-b949-e597fd5c27db']],
    ['U','明确说明保存的现行表格未直接列deepseek-chat数值；请求的上下文仍未解决。',['afc900e1-b5df-4c67-bd0f-5a91538bff19']],
    ['U','最大输出/默认值仍未解决，未把其他模型上限移植给目标。',['afc900e1-b5df-4c67-bd0f-5a91538bff19']],
    ['U','三类价格/币种/单位未给，明确局限于已读表格，保留未解决范围。',['afc900e1-b5df-4c67-bd0f-5a91538bff19']],
    ['F','限定“2026-07-24之前”有历史范围价值，但未交代官方宣布停止使用且已过日期，仍称当前；时效要求整体未满足。',['d7e8a41f-835e-46e3-b949-e597fd5c27db']]
  ],
  [
    ['E','明确Free套餐、官方当前取得文档，并说明未取得生效日期/版本。',['6ed7e1fc-5e4f-4555-9d9f-de5d8432dc27']],
    ['E','原句直接支持每月最多2000次代码补全。',['6ed7e1fc-5e4f-4555-9d9f-de5d8432dc27']],
    ['F','表格只写An allowance of GitHub AI Credits，未保存月度周期或chat消耗映射的联合引用；答案擅加“每月”且未把现行机制讲清。',['d5798d57-fc1d-40c4-93f8-3782c99f2fad']],
    ['F','遗漏chat/credits/premium request边界，虽然已保存chat与agents消耗credits、补全不消耗credits的明确原句。',['090dd69a-a578-4570-9b38-7074b1c24a45']],
    ['U','明确补全与chat超额处理未核实，未套用付费计划条款。',[]]
  ],
  [
    ['F','最终说已读官方摘录仅含标题first AI software engineer，但同批READ已有autonomously find and fix bugs；遗漏能力声明且材料范围描述不实，日期仍未知。',['43340e00-1cc6-4181-b77f-d5f2d9597d08']],
    ['L','HN edude03确实自述私测时用过，但未保存具体任务/过程/结果；只可作为使用经历与观感，不能算完整实测报告。',['c51d25b8-a1ba-4e8d-961a-f98c3f1df756']],
    ['F','没有回答支持/成功案例，也未明确交代在HN寻找成功案例的结果与范围；不能用非HN官方案例替代。',[]],
    ['L','HN原句是对官方演示是否完成AWS任务的质疑，答案归因为评论者且限定演示；是有用批评，非评论者亲手使用失败实测。',['5d971d82-f245-4ffa-832d-b0d8a76b828a']],
    ['F','没有按可比任务/版本回答这些材料是否支持官方广义自主软件工程能力。',[]]
  ],
  [
    ['L','给出2025-02-26微软开发者博客的历史50条说法，但未识别已发现2024-12-18首发页为更早政策线索；不能称最早已核实原始来源。',['f4c9fcdd-16e2-4079-a877-b59b32cb7a25']],
    ['E','列出四个实际来源与所存摘录，准确把其余无50次限定在摘录范围，未将摘要当原文。',['f4c9fcdd-16e2-4079-a877-b59b32cb7a25','19991776-0485-4a4e-9dae-5c2559885b25','af875ccd-e8a2-4067-abf9-843e179ca072','2b29f7b5-0c0b-42ee-9881-141c7853f895']],
    ['U','明确现有摘录没有转载上游信息，未强造转载链；没有完成已确认家族分组。',[]],
    ['F','虽保留独立性未知，但未说明独立发布与同一政策上游边界，也未明确历史50次不等于当前额度、现行机制需另核实。',[]]
  ],
  [
    ['L','准确限定Cursor Agent编写Blender脚本的个案，注明版本/套餐未知；未完整识别底层模型和MCP路径，不能作为全栈当前规格。',['80d3727e-6972-48b6-8496-8b603bf88f04']],
    ['L','原作者明确实验目的及甜甜圈/糖霜结果，支持限定Blender个案；操作步骤和底层模型未完整取得。',['80d3727e-6972-48b6-8496-8b603bf88f04','70b221d8-0e68-4387-bd2d-58d684cbfd36']],
    ['U','确有CAD定向搜索，但返回候选未被读取；答案明确检索不完整、没有CAD评价，不能算CAD实测覆盖。',[]],
    ['L','甜甜圈/糖霜渲染相当不错为同一作者一次实验的自述，不泛化。',['70b221d8-0e68-4387-bd2d-58d684cbfd36']],
    ['L','lots of coaching直接支持大量指导局限，版本/套餐未知明确。',['70b221d8-0e68-4387-bd2d-58d684cbfd36']],
    ['F','未向用户区分已取得的MCP教程/标题/聚合页与第一手实验，未给来源家族；多个URL不能算多个独立报告。',[]],
    ['L','提供一个Blender个案和指导限制，明确CAD未完成，没有由缺少资料推出不能做；未形成完整跨CAD/Blender评价。',['70b221d8-0e68-4387-bd2d-58d684cbfd36']]
  ],
  [
    ['F','没有识别GitHub与Microsoft Copilot实际歧义，没有澄清。',[]],
    ['F','静默选择GitHub，提供2025历史50条与Visual Studio限制，既非澄清后回答也非并列候选当前机制。',['51fc97f7-ae81-4ca0-af12-caaf8e7c82e3']],
    ['F','虽历史条目有日期，仍未说明产品选择不确定及不能据历史条目确定现行通用额度。',[]]
  ],
  [
    ['E','确有知乎定向发现和4个知乎URL实际读取，均HTTP403。',[]],
    ['U','无可读知乎开发者原句，明确无法回答；未用补充站冒充知乎。',[]],
    ['U','无知乎可读样本，条件/分歧未解决。',[]],
    ['E','最终明确403、未取得知乎原句及覆盖不足，并列出实际失败URL。',[]]
  ]
];
const findings = [
  ['S0','minor','英文引用片段缺模型表头，但同一引用中文片段保留表头与1M，联合足以支持；完整性不能只看单段。'],
  ['S1','major','引用保留停用句，但正文没有报告停用公告，且将已过期的阶段称当前。没有验证实际API请求拒绝，评价也不声称已实测停用。'],
  ['S2','major','“每月有一定量GitHub AI Credits”的“每月”没有所引表格原句支持；allowance不能自行确定周期。'],
  ['S2','major','已保存You use credits when you chat...Code completions...don’t use credits，却未转化为用户需要的计量边界。'],
  ['S3','major','最终“已读官方博客摘录仅含first AI software engineer”与READ证据43340e00的autonomously find and fix bugs矛盾。该原句仍只证明找修bug的官方宣称，不能支持所有工程任务自主完成。'],
  ['S3','major','HN批评演示与个人“曾使用”的观感，不是具备任务/过程/结果的第一手使用报告；不能把两条计为独立实际实验。'],
  ['S3','minor','dev.to标题10完成3并未被正文摘录核实，最终保持不确定是合理限制，不能因标题数字相同就算实测覆盖。'],
  ['S4','major','GitHub首发文章选成作者简介；“该摘录未提50次”为真但没有推进原始来源与转载链问题。四个域名/页面不是四次独立政策验证。'],
  ['S5','major','只有Atomic Object一组可限定的原作者实验；腾讯云标题、agihunt标题、MCP安装说明均不能补足3报告/2独立站点门槛。'],
  ['S5','minor','CAD补搜后没有读取CAD候选，daily.dev失败链接属于Blender文章，不能视为已尝试CAD实测来源。'],
  ['S6','major','历史GitHub条目本身可支持当时50条；本题失败在歧义路由和当前适用性，不指控该历史数值伪造。'],
  ['S7','major','36氪安全检测页被记READ；所存只有检测提示，无开发者评价。最终没有将其当证据，避免了外泄错误结论。'],
  ['S8','critical','初次FINISH已识别创作无需搜索，却被程序以“尚未执行任何检索”拒绝；随后2搜索4读取，最终输出证据不足而非诗/范围说明。']
];
const cases = [];
for (let i=0;i<9;i++) {
  const cid = `S${i}`;
  const dir = path.join(root,cid,fs.readdirSync(path.join(root,cid))[0]);
  const response=JSON.parse(fs.readFileSync(path.join(dir,'snapshot-response.json'),'utf8'));
  const inv=JSON.parse(fs.readFileSync(path.join(dir,'investigation.json'),'utf8')).detail.investigation;
  const val=JSON.parse(fs.readFileSync(path.join(dir,'validation.json'),'utf8'));
  const s=response.snapshot, loop=s.verificationAudit.investigationLoop;
  const checks=[];
  for(const a of response.answers) for(const c of a.citations) for(const q of c.quotes){
    const e=s.evidence.find(e=>e.id===q.evidenceId);
    const position=e?.originalLocation?.locator.match(/UTF-16 \[(\d+),(\d+)\)/);
    checks.push({marker:c.marker,evidenceId:q.evidenceId,exactQuote:e?.originalExcerpt===q.originalExcerpt,
      hash:!!e&&crypto.createHash('sha256').update(q.originalExcerpt).digest('hex')===e.contentHash,
      savedBlockPosition:position&&e.originalLocation.context.slice(+position[1],+position[2])===q.originalExcerpt?true:null,
      savedContextContainsQuote:!!e?.originalLocation?.context.includes(q.originalExcerpt),
      limitation:'v3 exports excerpt/block context, no full immutable document/raw artifact; cannot verify full-page text/raw hash'});
  }
  const fields=i<8?grades[i].map(([status,reason,evidenceIds],j)=>({id:`${cid}.${j+1}`,status,reason,evidenceIds})):[];
  const counts=Object.fromEntries(['E','L','U','F'].map(k=>[k,fields.filter(f=>f.status===k).length]));
  const reads=loop.collectionCalls.filter(c=>c.operation==='read');
  cases.push({case:cid,question:inv.question,investigationId:inv.id,snapshotId:s.id,status:inv.status,
    startedAt:inv.startedAt,completedAt:inv.completedAt,durationMs:Date.parse(inv.completedAt)-Date.parse(inv.startedAt),
    fields,counts,ratios:i<8?{E:counts.E/fields.length,EL:(counts.E+counts.L)/fields.length,U:counts.U/fields.length,F:counts.F/fields.length}:null,
    usability:i===0?'PASS':i===5?'LIMITED_USEFUL':i===7?'HONEST_ACCESS_FAILURE':'FAIL',
    routing:i===8?{pass:false,reason:'Creative request entered fact research, searched/read and returned evidence-insufficiency failure.'}:null,
    metrics:{searchCalls:s.retrievalRecords.length,searches:s.retrievalRecords.map(r=>({provider:r.provider,query:r.query,status:r.status})),
      documentAttempts:reads.length,uniqueRequestedUrls:new Set(reads.map(r=>r.target)).size,successfulReadCalls:reads.filter(r=>r.outcome==='SUCCEEDED').length,
      httpGetRequestsIncludingRedirects:loop.httpAttempts.filter(a=>a.method==='GET').length,
      cacheSelections:0,cacheSelectionsExplanation:'v3 re-reads use network collection; no document-cache selection operation recorded',
      duplicateUrlExcerptPairs:s.evidence.length-new Set(s.evidence.map(e=>e.sourceUrl+'|'+e.contentHash)).size,
      evidenceCount:s.evidence.length,modelCalls:val.modelCalls.length,inputTokens:val.modelCalls.reduce((n,c)=>n+(c.inputTokens||0),0),outputTokens:val.modelCalls.reduce((n,c)=>n+(c.outputTokens||0),0),unknownUsage:val.modelCalls.filter(c=>c.inputTokens==null||c.outputTokens==null).length,
      modelFailures:val.modelCalls.filter(c=>c.outcome!=='SUCCEEDED').length,configuredMoney:null,
      firsthandOriginalReportFamiliesObserved:i===5?1:0,independentReportGroupsConfirmedByReviewer:0,formalRecommendationEligible:false},
    quoteIntegrityChecks:checks,criticalFindingIds:findings.map((f,j)=>f[0]===cid?`V3-${j+1}`:null).filter(Boolean),
    answerBody:response.answers.map(a=>a.body).join('\n\n'),
    sources:s.evidence.map(e=>({id:e.id,url:e.sourceUrl,status:e.readStatus,error:e.readError,excerpt:e.originalExcerpt,author:e.metadata.author,publishedAt:e.metadata.publishedAt,contentHash:e.contentHash,locator:e.originalLocation?.locator??null}))});
}
const totals=Object.fromEntries(['E','L','U','F'].map(k=>[k,cases.reduce((n,c)=>n+c.counts[k],0)]));
const result={schemaVersion:'1.0',reviewType:'independent-offline-frozen-fields',reference:'reference-v1.md',generationChainExcluded:true,
  inputManifest:manifest,scope:'Saved exports only; no fresh internet truth lookup, production/DB/Worker unchanged.',
  limitations:['v3 lacks full immutable document/raw artifacts; excerpt/block hash checks cannot establish whole-page acquisition integrity.','No configured currency pricing: token counts are observed usage, not money.','Same time/search/document/reserve ceilings; no claim of identical per-engine token or model-call caps.','Manifest records base commit plus dirty v4 research files; label is engine v3, not a pristine historical binary.'],
  aggregate:{factCases:8,mandatoryFields:36,counts:totals,E:totals.E/36,EL:(totals.E+totals.L)/36,strictUsefulPasses:cases.slice(0,8).filter(c=>c.usability==='PASS').length,
    limitedUsefulCases:['S5'],honestAccessFailureCases:['S7'],routingS8Pass:false,targetAtLeast7Of8Met:false},
  findings:findings.map(([caseId,severity,description],i)=>({id:`V3-${i+1}`,case:caseId,severity,description})),cases};
fs.writeFileSync(path.join(__dirname,'comparison-v3-review.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({aggregate:result.aggregate,quotes:cases.flatMap(c=>c.quoteIntegrityChecks).length,allExactAndHash:cases.flatMap(c=>c.quoteIntegrityChecks).every(q=>q.exactQuote&&q.hash),positionsProven:cases.flatMap(c=>c.quoteIntegrityChecks).filter(q=>q.savedBlockPosition===true).length,positionsInconclusive:cases.flatMap(c=>c.quoteIntegrityChecks).filter(q=>q.savedBlockPosition===null).length}));
