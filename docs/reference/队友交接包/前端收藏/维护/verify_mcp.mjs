// 只读验证：启动本机固定版本的官方MCP，读取工具目录及一个公共检索结果。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const user = process.env.USERPROFILE;
const sdk = path.join(user, '.codex/tools/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm');
const { Client } = await import(pathToFileURL(path.join(sdk, 'client/index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(path.join(sdk, 'client/stdio.js')).href);
const prefix = path.join(user, '.codex/tools/frontend-mcp/node_modules');
const servers = [
  { id:'frontend-shadcn', version:'4.22.1', cwd:path.join(root,'接入/registry-workspace'), args:[path.join(prefix,'shadcn/dist/index.js'),'mcp'] },
  { id:'frontend-magicui', version:'2.0.0', args:[path.join(prefix,'@magicuidesign/mcp/dist/server.js')] }
];
const reports=[];
for (const server of servers) {
  const transport = new StdioClientTransport({command:process.execPath,args:server.args,stderr:'pipe',cwd:server.cwd??root});
  const client = new Client({name:'frontend-library-verification',version:'1.0.0'});
  const record = {server:server.id,version:server.version,checkedAt:new Date().toISOString(),initialized:false};
  try {
    // 丢弃stderr内容，避免把第三方启动输出写进证据文件。
    transport.stderr?.on('data',()=>{});
    await client.connect(transport,{timeout:30000});
    record.initialized=true;
    const {tools} = await client.listTools({}, {timeout:30000});
    record.tools=tools.map(t=>({name:t.name,inputSchema:t.inputSchema}));
    if (server.id==='frontend-shadcn') {
      const registry=await client.callTool({name:'get_project_registries',arguments:{}},undefined,{timeout:30000});
      record.registries=registry;
      const result=await client.callTool({name:'search_items_in_registries',arguments:{registries:['@aceternity'],query:'3d-marquee',limit:1}},undefined,{timeout:30000});
      record.readProbe={tool:'search_items_in_registries',ok:!result.isError,result};
      record.extraProbes=[];
      for (const [registry,query] of [['@react-bits','text'],['@shadcnblocks','hero']]) {
        try {
          const extra=await client.callTool({name:'search_items_in_registries',arguments:{registries:[registry],query,limit:1}},undefined,{timeout:30000});
          record.extraProbes.push({registry,ok:!extra.isError,result:extra});
        } catch(error) { record.extraProbes.push({registry,ok:false,error:String(error.message)}); }
      }
    }
    if (server.id==='frontend-magicui') {
      const tool=tools.find(t=>t.name==='searchRegistryItems') ?? tools.find(t=>t.name==='listRegistryItems');
      if (tool) {
        const result=await client.callTool({name:tool.name,arguments:{query:'marquee',limit:1}},undefined,{timeout:30000});
        record.readProbe={tool:tool.name,ok:!result.isError,result};
      }
    }
  } catch(error) { record.error=String(error.message); }
  finally { await client.close().catch(()=>{}); await transport.close().catch(()=>{}); }
  reports.push(record);
}
await fs.mkdir(path.join(root,'接入'),{recursive:true});
await fs.writeFile(path.join(root,'接入/mcp-verification.json'),JSON.stringify(reports,null,2),'utf8');
for (const r of reports) console.log(JSON.stringify({server:r.server,initialized:r.initialized,tools:r.tools?.map(t=>t.name),probe:r.readProbe?.ok,error:r.error}));
process.exitCode=reports.every(r=>r.initialized && r.tools?.length && !r.error && r.readProbe?.ok!==false && (r.extraProbes??[]).every(p=>p.ok))?0:1;
