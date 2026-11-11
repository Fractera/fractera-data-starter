# Migration «block → section» — 2026-11-11

Node step 717-2: one word, «section», for a designed part of a page; a section is one folder `components/sections/<kind>/`; a page's
list is `body`. «Block» keeps one meaning — the address of a container (`data-block`, `#block=`, `npm run blocks:ids`).
Script `scripts/migrate-sections.mjs`, map `scripts/migrate-sections.map.json`.

## Done (14)

- section `block-access-map` → folder `components/sections/section-access-map/` (index.tsx, markdown.ts, README.md)
- the set `components/sections/index.ts` (one line per section; the type of a section item derived from it)
- rewritten `lib/aio/page-to-markdown.ts`
- rewritten `.claude/skills/README.md`
- rewritten `app/[lang]/(publicLayer)/_data/en.json`
- rewritten `app/[lang]/(publicLayer)/_data/ru.json`
- rewritten `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/README.md`
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx`: «blocks» → «body» 9× — the page's list; read the file if one of them meant something else
- rewritten `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/markdown.ts`
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/words.ts`: «blocks» → «body» 5× — the page's list; read the file if one of them meant something else
- `lib/content/blocks/registry.tsx`: «blocks» → «body» 3× — the page's list; read the file if one of them meant something else
- rewritten `lib/content/blocks/types.ts`
- `scripts/check-element-key.mjs`: «blocks» → «body» 1× — the page's list; read the file if one of them meant something else
- rewritten `components/sections/section-access-map/index.tsx`

## For your eye (66)

Each line: change the sense «section» to «section» (in Russian «секция»), keep the address; a line that is right as it is stays.

- `lib/aio/blocks-to-markdown.ts` — no case for this kind in the old switch — write its markdown.ts by hand (the set does not compile without it): «block-section-head»
- `lib/aio/blocks-to-markdown.ts` — no case for this kind in the old switch — write its markdown.ts by hand (the set does not compile without it): «block-hero-centered»
- `lib/aio/blocks-to-markdown.ts` — no case for this kind in the old switch — write its markdown.ts by hand (the set does not compile without it): «block-warning-card»
- `lib/content/blocks/types.ts` — no one-line member of the union for this kind — write `export type Shape` in its folder by hand: «block-faq»
- `lib/aio/blocks-to-markdown.ts` — no case for this kind in the old switch — write its markdown.ts by hand (the set does not compile without it): «block-faq»
- `lib/aio/blocks-to-markdown.ts` — no case for this kind in the old switch — write its markdown.ts by hand (the set does not compile without it): «block-access-map»
- `components/blocks/block-section-head.tsx` — the set imports a file that does not exist: «block-section-head»
- `components/blocks/block-hero-centered.tsx` — the set imports a file that does not exist: «block-hero-centered»
- `components/blocks/block-warning-card.tsx` — the set imports a file that does not exist: «block-warning-card»
- `components/blocks/block-faq.tsx` — the set imports a file that does not exist: «block-faq»
- `lib/content/page-items.ts` — both lib/content/blocks/types.ts and lib/content/page-items.ts exist — merge by hand: «lib/content/page-items.ts»
- `components/blocks/block-access-map.card.json` — a file still lives in an old folder — move it where it belongs (a section → components/sections/<kind>/): «components/blocks/block-access-map.card.json»
- `lib/content/blocks/registry.tsx` — a file still lives in an old folder — move it where it belongs (a section → components/sections/<kind>/): «lib/content/blocks/registry.tsx»
- `lib/content/blocks/types.ts` — a file still lives in an old folder — move it where it belongs (a section → components/sections/<kind>/): «lib/content/blocks/types.ts»
- `lib/aio/page-to-markdown.ts:49` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «return ['## ${block.title}', ...(block.note ? ['', block.note] : []), '', '**${block.outer.title}** — ${block.outer.text}', '', ...block.spaces.map((s) => '- **${s.title}** — ${s.text}'), ...(block.be»
- `.claude/skills/README.md:17` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «| 'use-page-tree' | ours, 'build-skills' | pages as data folders; a page is one sequence of section-* · text-* · widget-*; blocks from the registry | ✅ 2026-10-07 |»
- `.claude/skills/build-skills/skills/backup-schedule/SKILL.md:35` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «- A copy that blocks the server: stream large files, never read a whole database into memory on this small machine.»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:65` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_components/element-blocks-pages.tsx",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:70` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_libs/element-blocks.ts",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:75` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:76` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/benefits/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:77` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/charts/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:78` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/comparison/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:79` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/dialogs/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:80` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/en.json",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:81` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/hero/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:82` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/how-it-works/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:83` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/meta.json",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:84` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/page-material/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:85` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/pricing/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:86` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/product-demo/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:87` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/ru.json",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:88` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/showcase/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:89` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/testimonials/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:90` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/trust/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:91` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/use-cases/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:92` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_pages/blocks/workspace/README.md",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:131` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_widgets/static/widget-static-element-blocks/index.tsx",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:132` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_widgets/static/widget-static-element-blocks/pager.client.tsx",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:133` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_widgets/static/widget-static-element-blocks/table.client.tsx",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:134` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/_widgets/static/widget-static-element-blocks/ui.i18n.ts",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:136` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/blocks/[section]/[name]/page.tsx",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:137` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"app/[lang]/(protectedLayer)/admin/blocks/[section]/page.tsx",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:280` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"scripts/blocks.mjs"»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:287` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"components/blocks",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:312` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"lib/blocks",»
- `.claude/skills/build-skills/skills/use-element-tree/tree-manifest.json:315` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"lib/content/blocks",»
- `NODE-CONTRACT.json:8` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"note": "A wish, not a decision. The node assigns the actual port from the block 24680-25679. Ask the node, never remember."»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/README.md:4` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «'bare', this widget draws it from the page data blocks, a section is 'section-head' and the blocks up to the next, its view chosen»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/README.md:6` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «other 'id' — the general view). Words only in the data (en, ru, 'humanizer'); the machine copy comes from the items, 'markdown.ts'»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx:17` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// объектного хранилища (650-4) под своим именем: страница рисует себя из своих частей данных ('words.ts'); раздел —»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx:18` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 'section-head' и блоки до следующего, вид раздела выбирается по его 'id', незнакомый 'id' — общим видом. Вид — токены»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx:261` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «/** Чья это память (узел, шаг 650-4): схема "кто что видит" — блок каталога 'section-access-map' (заголовок раздела — его заголовок), под»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx:283` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «{/* 662-2: a section of only questions and answers — the section draws its own heading. */}»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx:288` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 662-2: a section of the set (questions and answers, cards) is drawn by the set, as on the graph's landing.»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/index.tsx:325` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «/** Вопросы и ответы: две колонки на всю ширину; разметка FAQPage для поисковиков — как у секции набора. */»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/markdown.ts:1` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// Текст виджета для машин. Своих слов у виджета нет: всё, что он рисует, — части данных главной, а они уже идут в markdown-копию»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/words.ts:4` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// Слова лендинга элемента (база данных узла) — части главной ('(publicLayer)/_data/<язык>.json'). Страница 'bare' (шаг 423): её части рисует этот виджет,»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-data-landing/words.ts:15` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «/** Первый экран и разделы: раздел — 'section-head' и блоки до следующего; виджеты последовательности пропускаются. */»
- `components/blocks/block-access-map.card.json:56` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «"markdown": "case 'block-access-map':\n      return ['## ${block.title}', ...(block.note ? ['', block.note] : []), '', '**${block.outer.title}** — ${block.outer.text}', '', ...block.spaces.map((s) => »
- `lib/content/blocks/registry.tsx:25` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «/** Нарисовать список блоков по порядку; 'keyPrefix' держит ключи уникальными между вызовами на одной странице. */»
- `lib/content/blocks/types.ts:12` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «* Постоянный адрес блока (317-1): буква + 4 знака base36, один на всех языках. По нему подсветка в Preview называет блок,»
- `lib/content/blocks/types.ts:20` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 423: типографика элемента ('lib/content/text-set.tsx') — третий вид рядом с блоками и виджетами.»
- `lib/content/blocks/types.ts:31` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «/** Вопрос и ответ раздела FAQ — рисует блок 'faq' из "Блоков", он же ставит разметку 'FAQPage'. */»
- `lib/data-store/db.mjs:29` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// после удаления этого куска кода слово 'products' в службе не встречается вовсе.»
- `components/sections/section-access-map/index.tsx:9` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// Слова секции общие: та же секция рисует роли, папки или любые "один видит всё, каждый — своё".»

## Then

`npm run prebuild`, `npx tsc --noEmit`, the build, `npm run eyes` on a page with sections, one commit.
