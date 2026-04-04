from __future__ import annotations

import json
from pathlib import Path
from jinja2 import Template

project = 'バーサイト'
author = 'Your Name'
extensions = ['sphinx.ext.githubpages']
templates_path = ['_templates']
exclude_patterns = []
language = 'ja'
html_theme = 'alabaster'
html_static_path = ['_static']
html_css_files = ['shopping-street.css']
html_title = 'バーサイト'
html_baseurl = 'https://YOUR_NAME.github.io/YOUR_REPO/'

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
       {image_html}
     </div>
     <div class="bar-card__body">
       <p class="bar-card__category">{category}</p>
       <h2 class="bar-card__title">{name}</h2>
       <p class="bar-card__area">{area}</p>
       <p class="bar-card__desc">{description}</p>
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
html_context = {'bars': bars}


def _generate_bar_pages() -> None:
    GENERATED_BARS_DIR.mkdir(parents=True, exist_ok=True)
    detail_template = Template(BAR_TEMPLATE_FILE.read_text(encoding='utf-8'))

    for old_file in GENERATED_BARS_DIR.glob('*.rst'):
        old_file.unlink()

    cards: list[str] = []
    toctree_entries: list[str] = []

    for bar in bars:
        slug = bar.get('slug') or bar.get('id') or 'bar'
        rendered = detail_template.render(bar=bar)
        (GENERATED_BARS_DIR / f'{slug}.rst').write_text(rendered, encoding='utf-8')

        if bar.get('image_url'):
            image_html = f'<img class="bar-card__image" src="{bar["image_url"]}" alt="{bar.get("name", "")}">'
        else:
            image_html = '<div class="bar-card__placeholder">BAR</div>'

        tags_html = ''.join(
            f'<span class="bar-tag">{tag}</span>' for tag in bar.get('tags', [])
        )

        cards.append(
            BAR_CARD_TEMPLATE.format(
                href=f'{slug}.html',
                image_html=image_html,
                category=bar.get('category', ''),
                name=bar.get('name', ''),
                area=bar.get('area', ''),
                description=bar.get('description', ''),
                tags_html=tags_html,
            )
        )
        toctree_entries.append(f'   {slug}')

    index_content = BAR_INDEX_TEMPLATE.format(
        cards='\n'.join(cards),
        toctree='\n'.join(toctree_entries),
    )
    (GENERATED_BARS_DIR / 'index.rst').write_text(index_content, encoding='utf-8')


_generate_bar_pages()
