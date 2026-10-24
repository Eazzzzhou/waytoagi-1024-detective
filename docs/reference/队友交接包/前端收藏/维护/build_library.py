"""从一个JSON目录生成可直接双击的本地导航页，不需要构建依赖或服务器。"""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / '数据/resources.json').read_text(encoding='utf-8'))
resources = data['resources']
categories = {c['id']: c for c in data['categories']}
assert len({r['id'] for r in resources}) == len(resources)
assert all(r['category'] in categories for r in resources)
assert all(r.get('url', '').startswith('https://') and r.get('sources') for r in resources)
escape = html.escape

def card(r):
    image = r.get('preview_image', '') if r['id']!='happy-hues' else ''
    thumb = (f'<img src="{escape(image, quote=True)}" alt="{escape(r["name"])} 官网预览图" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">' if image else '')
    if r['id']=='happy-hues':
        thumb='<div class="palette-preview" aria-label="Happy Hues 14实际配色">'+''.join(f'<span style="background:{color}"></span>' for color in ['#fffffe','#272343','#ffd803','#e3f6f5','#bae8e8'])+'</div>'
    search = ' '.join([r['name'],r['summary'],*r['tags'],*r['stack'],*r['use_for'],*r['output'],r['access']['kind']]).lower()
    mcp = r['mcp']['status'] in ('shared_shadcn','official_installed')
    badges = f'<span class="badge">{escape(r["free"]["status"])}</span>' + ('<span class="badge mcp">MCP已配置</span>' if mcp else '')
    return f'''<article class="card" data-id="{r['id']}" data-category="{r['category']}" data-search="{escape(search, quote=True)}" data-mcp="{str(mcp).lower()}">
<button class="thumb preview-trigger" data-preview="{r['id']}" aria-label="预览 {escape(r['name'])}"><span class="fallback"><b>{escape(r['name'])}</b><small>{escape(' / '.join(r['tags'][:3]))}</small></span>{thumb}<span class="peek">快速预览 ↗</span></button>
<div class="card-content"><div class="card-meta">{escape(categories[r['category']]['name'])}</div><h2>{escape(r['name'])}</h2><p class="summary">{escape(r['summary'])}</p><div class="badges">{badges}</div><div class="card-footer"><span>{escape(' · '.join(r['output'][:2]))}</span><a href="{escape(r['url'],quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="打开{escape(r['name'])}官网">官网 ↗</a></div></div></article>'''

counts = {key:sum(key in [r['category'],*r['secondary_categories']] for r in resources) for key in categories}
nav = f'<button class="nav-item active" data-category="all"><span>全部收藏</span><b>{len(resources)}</b></button>'
for c in data['categories']:
    nav += f'<button class="nav-item" data-category="{c["id"]}"><span>{escape(c["name"])}</span><b>{counts[c["id"]]}</b></button>'
payload = json.dumps(data, ensure_ascii=False).replace('</','<\\/')
template = (ROOT / '维护/page.template.html').read_text(encoding='utf-8')
result = template.replace('<!--NAV-->',nav).replace('<!--CARDS-->','\n'.join(card(r) for r in resources)).replace('/*CATALOG*/',payload)
result = result.replace('<!--SITE_COUNT-->', str(len(resources))).replace('<!--CATEGORY_COUNT-->', str(len(categories))).replace('<!--UPDATED-->', data['updated_at'].replace('-', '.'))
(ROOT / '打开收藏.html').write_text(result, encoding='utf-8')

portable = {'mcpServers':{
    'frontend-shadcn':{'command':'npx','args':['-y','shadcn@4.22.1','mcp']},
    'frontend-magicui':{'command':'npx','args':['-y','@magicuidesign/mcp@2.0.0']}
}}
(ROOT / '接入/mcp.portable.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Generated 打开收藏.html: {len(resources)} sites, {len(data["examples"])} example, {len(categories)} categories.')
