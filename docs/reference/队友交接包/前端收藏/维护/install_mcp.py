"""为本收藏库安装后的官方MCP添加用户级配置；保留所有既有设置。"""
import json
import os
from pathlib import Path
import shutil
import sys
import tomllib
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
USER = Path(os.environ['USERPROFILE'])
CONFIG = USER / '.codex' / 'config.toml'
NODE = shutil.which('node')
PREFIX = USER / '.codex' / 'tools' / 'frontend-mcp' / 'node_modules'
if not NODE:
    raise SystemExit('Node.js not found; no configuration was changed.')
entries = {
    'frontend-shadcn': {
        'command': NODE,
        'args': [str(PREFIX / 'shadcn/dist/index.js'), 'mcp'],
        'cwd': str(ROOT / '接入/registry-workspace'),
        'startup_timeout_sec': 30,
        'tool_timeout_sec': 60,
        'enabled_tools': ['get_project_registries', 'list_items_in_registries', 'search_items_in_registries', 'view_items_in_registries', 'get_item_examples_from_registries', 'get_add_command_for_items', 'get_audit_checklist']
    },
    'frontend-magicui': {
        'command': NODE,
        'args': [str(PREFIX / '@magicuidesign/mcp/dist/server.js')],
        'startup_timeout_sec': 30,
        'tool_timeout_sec': 60,
        'enabled_tools': ['listRegistryItems', 'getRegistryItem', 'searchRegistryItems']
    },
    'frontend-21st': {
        'url': 'https://21st.dev/api/mcp',
        'bearer_token_env_var': 'API_KEY_21ST',
        'enabled': False
    }
}
for name in ['shadcn', '@magicuidesign/mcp']:
    package = PREFIX / name / 'package.json'
    if not package.is_file():
        raise SystemExit(f'Missing installed package {name}; configuration unchanged.')
raw = CONFIG.read_text(encoding='utf-8')
before = tomllib.loads(raw)
existing = before.get('mcp_servers', {})
for key, value in entries.items():
    if key in existing and existing[key] != value:
        raise SystemExit(f'{key} already exists with another configuration; left unchanged.')
stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
addition = '\n# Frontend collection: public registry lookup; added 2026-10-20.\n'
for key, value in entries.items():
    if key in existing:
        continue
    addition += f'\n[mcp_servers.{key}]\n'
    for field, val in value.items():
        addition += f'{field} = {json.dumps(val, ensure_ascii=False)}\n'
after_raw = raw + addition if any(k not in existing for k in entries) else raw
after = tomllib.loads(after_raw)
for key, value in before.items():
    if key != 'mcp_servers' and after.get(key) != value:
        raise SystemExit(f'Unrelated setting changed: {key}')
for key, value in existing.items():
    if after['mcp_servers'][key] != value:
        raise SystemExit(f'Existing MCP changed: {key}')
backup = None
if after_raw != raw:
    backup = CONFIG.with_name('config.frontend-backup-' + stamp + '.toml')
    shutil.copy2(CONFIG, backup)
    CONFIG.write_text(after_raw, encoding='utf-8')

agent_file = USER / '.codex' / 'AGENTS.md'
agent_raw = agent_file.read_text(encoding='utf-8') if agent_file.exists() else ''
pointer = '\n## 前端素材收藏\n\n涉及前端界面实现、UI选型、配色、插画、背景或动效素材时，先读取 `C:\\Users\\qianchen\\Desktop\\前端收藏\\AGENTS.md`，按任务访问对应条目；优先复用项目现有组件并核实免费范围与许可。\n'
if '前端收藏\\AGENTS.md' not in agent_raw:
    if agent_file.exists():
        shutil.copy2(agent_file, agent_file.with_name('AGENTS.frontend-backup-' + stamp + '.md'))
    agent_file.write_text(agent_raw.rstrip() + '\n' + pointer, encoding='utf-8')

verification_path = ROOT / '接入/mcp-verification.json'
verification = json.loads(verification_path.read_text(encoding='utf-8')) if verification_path.exists() else []
status = {
    'checked_at': datetime.now(timezone.utc).isoformat(),
    'config_path': str(CONFIG),
    'backup_path': str(backup) if backup else None,
    'package_path': str(PREFIX.parent),
    'activation': '两个stdio服务已实测；Codex需新会话或重启加载新增配置。21st等待账号密钥后再启用。',
    'servers': [
        {'id': 'frontend-shadcn', 'status': 'installed_verified', 'version': '4.22.1', 'resources': ['react-bits', 'aceternity', 'shadcnblocks'], 'workspace': str(ROOT / '接入/registry-workspace')},
        {'id': 'frontend-magicui', 'status': 'installed_verified', 'version': '2.0.0', 'resources': ['magic-ui']},
        {'id': 'frontend-21st', 'status': 'configured_disabled_needs_auth', 'resources': ['21st'], 'reason': '缺少用户API_KEY_21ST；未尝试付费调用或浏览器登录。'}
    ],
    'existing_mcp_preserved': True,
    'agent_pointer': str(agent_file),
    'verification_file': 'mcp-verification.json'
}
for server in verification:
    if server.get('error') or not server.get('initialized') or not server.get('readProbe', {}).get('ok'):
        raise SystemExit('Verification is incomplete; inspect mcp-verification.json before claiming success.')
(ROOT / '接入/安装状态.json').write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'added': list(entries), 'preserved': list(existing), '21st': 'disabled_needs_auth', 'config': str(CONFIG)}, ensure_ascii=False))
