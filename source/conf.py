from __future__ import annotations

import json
from pathlib import Path
from jinja2 import Template

project = '商店街サイト'
author = 'Your Name'
extensions = ['sphinx.ext.githubpages']
templates_path = ['_templates']
exclude_patterns = []
language = 'ja'
html_theme = 'alabaster'
html_static_path = ['_static']
html_css_files = ['shopping-street.css']
html_title = '商店街サイト'
html_baseurl = 'https://YOUR_NAME.github.io/YOUR_REPO/'

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / 'data' / 'shops.json'
SOURCE_DIR = Path(__file__).resolve().parent
SHOP_TEMPLATE_FILE = SOURCE_DIR / '_templates' / 'shop_detail.rst.j2'
GENERATED_SHOPS_DIR = SOURCE_DIR / 'shops'

SHOP_INDEX_TEMPLATE = """店舗一覧
========

.. raw:: html

   <div class="street-intro">
     <p>路地を歩くように、気になるお店を見つけられる商店街のイメージでまとめています。</p>
   </div>

.. raw:: html

   <div class="shop-grid">

{cards}

.. raw:: html

   </div>

.. toctree::
   :hidden:

{toctree}
"""

CARD_TEMPLATE = """.. raw:: html

   <a class="shop-card" href="{href}">
     <div class="shop-card__image-wrap">
       {image_html}
     </div>
     <div class="shop-card__body">
       <p class="shop-card__category">{category}</p>
       <h2 class="shop-card__title">{name}</h2>
       <p class="shop-card__area">{area}</p>
       <p class="shop-card__desc">{description}</p>
       <div class="shop-card__tags">
         {tags_html}
       </div>
     </div>
   </a>
"""


def load_shops() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open('r', encoding='utf-8') as f:
        shops = json.load(f)
    return shops if isinstance(shops, list) else []


shops = load_shops()
html_context = {'shops': shops}


def _generate_shop_pages() -> None:
    GENERATED_SHOPS_DIR.mkdir(parents=True, exist_ok=True)
    detail_template = Template(SHOP_TEMPLATE_FILE.read_text(encoding='utf-8'))

    for old_file in GENERATED_SHOPS_DIR.glob('*.rst'):
        old_file.unlink()

    cards: list[str] = []
    toctree_entries: list[str] = []

    for shop in shops:
        slug = shop.get('slug') or shop.get('id') or 'shop'
        rendered = detail_template.render(shop=shop)
        (GENERATED_SHOPS_DIR / f'{slug}.rst').write_text(rendered, encoding='utf-8')

        if shop.get('image_url'):
            image_html = f'<img class="shop-card__image" src="{shop["image_url"]}" alt="{shop.get("name", "")}">'
        else:
            image_html = '<div class="shop-card__placeholder">商店街</div>'

        tags_html = ''.join(
            f'<span class="shop-tag">{tag}</span>' for tag in shop.get('tags', [])
        )

        cards.append(
            CARD_TEMPLATE.format(
                href=f'{slug}.html',
                image_html=image_html,
                category=shop.get('category', ''),
                name=shop.get('name', ''),
                area=shop.get('area', ''),
                description=shop.get('description', ''),
                tags_html=tags_html,
            )
        )
        toctree_entries.append(f'   {slug}')

    index_content = SHOP_INDEX_TEMPLATE.format(
        cards='\n'.join(cards),
        toctree='\n'.join(toctree_entries),
    )
    (GENERATED_SHOPS_DIR / 'index.rst').write_text(index_content, encoding='utf-8')


_generate_shop_pages()
