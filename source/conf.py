from __future__ import annotations

import json
import os
from pathlib import Path
from jinja2 import Template
from dotenv import load_dotenv

load_dotenv()

project = 'Nagasaki After Dark'
author = 'Your Name'
extensions = ['sphinx.ext.githubpages']
templates_path = ['_templates']
exclude_patterns = []
language = 'ja'
html_theme = 'alabaster'
html_static_path = ['_static']
html_css_files = ['css/main.css']
html_title = 'Nagasaki After Dark — 長崎の夜を、もっと深く。'
html_baseurl = 'https://YOUR_NAME.github.io/YOUR_REPO/'
html_favicon = '_static/favicon.ico'
html_theme_options = {
    'nosidebar': True,
    'body_max_width': '100%',
    'page_width': '100%',
    'sidebar_width': '0',
    'body_min_width': '0',
    'sidebar_collapse': True,
    'show_relbars': False,
}

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / 'data' / 'bars.json'
SOURCE_DIR = Path(__file__).resolve().parent
BAR_TEMPLATE_FILE = SOURCE_DIR / '_templates' / 'bar_detail.rst.j2'
GENERATED_BARS_DIR = SOURCE_DIR / 'bars'

BAR_INDEX_TEMPLATE = """バー一覧
========

.. raw:: html

   <div class="bar-intro">
     <p>夜の街を歩くように、気になるバーを見つけられるバーホッピングサイトです。</p>
   </div>

.. raw:: html

   <div class="bar-grid">

{cards}

.. raw:: html

   </div>

.. toctree::
   :hidden:

{toctree}
"""

BAR_CARD_TEMPLATE = """.. raw:: html

   <a class="bar-card" href="{href}">
     <div class="bar-card__image-wrap">
       {event_badge}
       {image_html}
     </div>
     <div class="bar-card__body">
       <h2 class="bar-card__title">{name}</h2>
       <p class="bar-card__area">{area}</p>
       <p class="bar-card__desc">{promotion}</p>
       <div class="bar-card__meta">
         <span class="bar-card__hours">{hours}</span>
       </div>
       <div class="bar-card__tags">
         {tags_html}
       </div>
     </div>
   </a>
"""


def load_bars() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open('r', encoding='utf-8') as f:
        bars = json.load(f)
    return bars if isinstance(bars, list) else []


bars = load_bars()
google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY', 'YOUR_API_KEY')
html_context = {
    'bars': bars,
    'google_maps_api_key': google_maps_api_key,
}


def _generate_bar_pages() -> None:
    GENERATED_BARS_DIR.mkdir(parents=True, exist_ok=True)
    detail_template = Template(BAR_TEMPLATE_FILE.read_text(encoding='utf-8'))

    for old_file in GENERATED_BARS_DIR.glob('*.rst'):
        old_file.unlink()

    cards: list[str] = []
    index_cards: list[str] = []
    toctree_entries: list[str] = []

    for bar in bars:
        slug = bar.get('slug') or bar.get('id') or 'bar'
        rendered = detail_template.render(bar=bar)
        (GENERATED_BARS_DIR / f'{slug}.rst').write_text(rendered, encoding='utf-8')

        if bar.get('image_url'):
            image_html = f'<img class="bar-card__image" src="{bar["image_url"]}" alt="{bar.get("name", "")}" loading="lazy">'
        else:
            image_html = '<div class="bar-card__placeholder">🍸</div>'

        # イベントバッジ
        event = bar.get('event', {})
        if event and event.get('active'):
            event_badge = f'<span class="bar-card__event-badge">🎉 {event.get("name", "EVENT")}</span>'
        else:
            event_badge = ''

        # タグ
        tags = bar.get('tags', [])
        tags_html = ''.join(
            f'<span class="bar-tag">{tag}</span>' for tag in tags if tag
        )

        cards.append(
            BAR_CARD_TEMPLATE.format(
                href=f'{slug}.html',
                image_html=image_html,
                event_badge=event_badge,
                name=bar.get('name', ''),
                area=bar.get('area', ''),
                hours=bar.get('hours', ''),
                promotion=bar.get('promotion', ''),
                tags_html=tags_html,
            )
        )
        index_cards.append(
            BAR_CARD_TEMPLATE.format(
                href=f'bars/{slug}.html',
                image_html=image_html,
                event_badge=event_badge,
                name=bar.get('name', ''),
                area=bar.get('area', ''),
                hours=bar.get('hours', ''),
                promotion=bar.get('promotion', ''),
                tags_html=tags_html,
            )
        )
        toctree_entries.append(f'   {slug}')

    index_content = BAR_INDEX_TEMPLATE.format(
        cards='\n'.join(cards),
        toctree='\n'.join(toctree_entries),
    )
    (GENERATED_BARS_DIR / 'index.rst').write_text(index_content, encoding='utf-8')

    # トップページ用のカードを出力（純粋なHTMLのみを1ブロックにまとめる）
    top_cards_lines = []
    top_cards_lines.append('<!-- generated top cards -->')
    top_cards_lines.append('<div class="bar-grid">')
    for bar in bars:
        slug = bar.get('slug') or bar.get('id') or 'bar'
        if bar.get('image_url'):
            img = f'<img class="bar-card__image" src="{bar["image_url"]}" alt="{bar.get("name", "")}" loading="lazy">'
        else:
            img = '<div class="bar-card__placeholder">🍸</div>'
        event = bar.get('event', {})
        ebadge = f'<span class="bar-card__event-badge">🎉 {event.get("name", "EVENT")}</span>' if event and event.get('active') else ''
        tags = ''.join(f'<span class="bar-tag">{t}</span>' for t in bar.get('tags', []) if t)
        top_cards_lines.append(f'<a class="bar-card" href="bars/{slug}.html">')
        top_cards_lines.append(f'  <div class="bar-card__image-wrap">{ebadge}{img}</div>')
        top_cards_lines.append(f'  <div class="bar-card__body">')
        top_cards_lines.append(f'    <h2 class="bar-card__title">{bar.get("name","")}</h2>')
        top_cards_lines.append(f'    <p class="bar-card__area">{bar.get("area","")}</p>')
        top_cards_lines.append(f'    <p class="bar-card__desc">{bar.get("promotion","")}</p>')
        top_cards_lines.append(f'    <div class="bar-card__meta"><span class="bar-card__hours">{bar.get("hours","")}</span></div>')
        top_cards_lines.append(f'    <div class="bar-card__tags">{tags}</div>')
        top_cards_lines.append(f'  </div>')
        top_cards_lines.append(f'</a>')
    top_cards_lines.append('</div>')
    top_html = '\n'.join(top_cards_lines)
    indented = '\n'.join('   ' + line for line in top_html.split('\n'))
    top_cards_rst = f".. raw:: html\n\n{indented}\n"
    (SOURCE_DIR / '_top_cards.rst').write_text(top_cards_rst, encoding='utf-8')

    # マップ用スクリプトの出力（APIキーを環境変数から展開）
    api_key = os.getenv('GOOGLE_MAPS_API_KEY', 'YOUR_API_KEY')
    map_scripts_html = f"""<script src="/_static/js/map.js"></script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key={api_key}&callback=initMap&language=ja"></script>"""
    map_scripts_rst = f".. raw:: html\n\n   {map_scripts_html.replace(chr(10), chr(10)+'   ')}\n\n"
    (SOURCE_DIR / '_map_scripts.rst').write_text(map_scripts_rst, encoding='utf-8')




_generate_bar_pages()

# Copy bars.json to _static/data for map.js
import shutil
def copy_bars_json(app, exception):
    if exception is None:
        static_data_dir = Path(app.outdir) / '_static' / 'data'
        static_data_dir.mkdir(parents=True, exist_ok=True)
        if DATA_FILE.exists():
            shutil.copy(DATA_FILE, static_data_dir / 'bars.json')

def setup(app):
    app.connect('build-finished', copy_bars_json)
