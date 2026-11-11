import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

const preview = process.argv.includes('--preview');
const output = preview ? '.preview' : 'docs';
const staging = output + '.build';
const site = 'https://luno-fantasy.github.io/eternoa-amour/';
const sister = 'https://luno-fantasy.github.io/luno-works/';
const brand = 'ÉTERNOA : AMOUR';
const motto = '物語の数だけ、恋がある。';
const works = JSON.parse(readFileSync('data/titles.json', 'utf8'));
if (preview) works.push(...JSON.parse(readFileSync('data/character-previews.json', 'utf8')));
const news = JSON.parse(readFileSync('data/news.json', 'utf8'));
const sections = [['HOME', ''], ['TITLES', 'titles/'], ['NEWS', 'news/'], ['ABOUT', 'about/']];

const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function talelynxLink(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://talelynx.ai' && url.pathname !== '/' && !url.username && !url.password;
  } catch {
    return false;
  }
}
function asset(path) {
  if (!/^(?:[\w-]+\/)+[\w.-]+\.(?:jpe?g|png|webp|avif)$/i.test(path) ||
      !existsSync(join('source', path))) throw new Error('画像ファイルを確認してください: ' + path);
}
const validId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const characters = work => work.characters ?? [];
const names = work => [work.characterName, ...characters(work).map(person => person.name)].filter(Boolean);
const isUpcoming = work => work.status === 'coming_soon' || work.status === 'coming-soon';
const ratings = ['unknown', 'all-ages', 'r18'];
function validateLinkSettings(record, label) {
  if (record.talelynxUrl && !talelynxLink(record.talelynxUrl)) throw new Error(label + ': Talelynx URL');
  if (record.showTalelynxLink !== undefined && typeof record.showTalelynxLink !== 'boolean') {
    throw new Error(label + ': showTalelynxLink は true または false を指定してください。');
  }
  if (record.rating !== undefined && !ratings.includes(record.rating)) throw new Error(label + ': rating');
}
const ids = new Set();
for (const work of works) {
  if (!validId(work.id) || ids.has(work.id)) {
    throw new Error('作品IDを確認してください: ' + work.id);
  }
  ids.add(work.id);
  if (work.status !== 'published' && work.status !== 'private' && !isUpcoming(work)) {
    throw new Error(work.id + ': status');
  }
  validateLinkSettings(work, work.id);
  const characterIds = new Set();
  for (const person of characters(work)) {
    if (!validId(person.id) || characterIds.has(person.id) || !person.name?.trim()) {
      throw new Error(work.id + ': 人物IDと名前を確認してください。');
    }
    characterIds.add(person.id);
    if (person.image) asset(person.image);
    validateLinkSettings(person, work.id + '/' + person.id);
  }
  if (work.characterDisplay === 'illustrations') {
    const assigned = new Set();
    for (const panel of work.characterIllustrations ?? []) {
      asset(panel.image);
      if (!Number.isInteger(panel.width) || panel.width <= 0 || !Number.isInteger(panel.height) || panel.height <= 0 ||
          panel.characterIds?.length !== 2) throw new Error(work.id + ': 人物紹介画像の寸法と組み合わせを確認してください。');
      for (const id of panel.characterIds) {
        if (!characterIds.has(id) || assigned.has(id)) throw new Error(work.id + ': 人物紹介画像の人物ID');
        assigned.add(id);
      }
    }
    if (!assigned.size || assigned.size !== characterIds.size) throw new Error(work.id + ': 全員の紹介画像が必要です。');
  }
  if (isUpcoming(work) && !work.title?.trim()) throw new Error(work.id + ': 公開予定作品のタイトルが必要です。');
  if (work.status === 'published' && (!work.title?.trim() || !names(work).some(name => name.trim()) ||
      !work.cover || !(work.summary?.trim() || work.story?.trim()) || !validDate(work.publishedAt))) {
    throw new Error(work.id + ': タイトル、人物名、正式カバー、紹介文またはあらすじ、作品紹介の公開日が必要です。');
  }
  if (work.updatedAt && !validDate(work.updatedAt)) throw new Error(work.id + ': updatedAt');
  if (work.cover) asset(work.cover);
  for (const item of work.gallery ?? []) asset(item.image);
}
for (const item of news) {
  if (!validDate(item.date) || !item.title?.trim() || (item.workId && !ids.has(item.workId))) {
    throw new Error('お知らせの日付・見出し・作品IDを確認してください。');
  }
}

const visible = works.filter(work => work.status === 'published' || isUpcoming(work) ||
  (preview && (work.cover || work.previewOnly)));
const detailWorks = visible.filter(work => !isUpcoming(work));
const detailIds = new Set(detailWorks.map(work => work.id));
visible.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
const visibleIds = new Set(visible.map(work => work.id));
const updates = news.filter(item => !item.workId || visibleIds.has(item.workId))
  .sort((a, b) => b.date.localeCompare(a.date));
const workUrl = work => 'titles/' + work.id + '/';
const characterUrl = (work, person) => workUrl(work) + 'characters/' + person.id + '/';
const paragraphs = value => value.split(/\n+/).filter(Boolean).map(line => '<p>' + esc(line) + '</p>').join('');
const wordmark = '<span class="wordmark" lang="fr">ÉTERNOA<span>AMOUR</span></span>';
const heading = (english, japanese, level = 'h2') =>
  `<div class="heading"><${level} lang="en">${english}</${level}><p>${japanese}</p></div>`;
const button = (href, label, extra = '') =>
  `<a class="button" href="${esc(href)}" ${extra}>${label}<span aria-hidden="true">↗</span></a>`;

function layout({ base, route, active, title, description = motto, cover, body, script = false, illustrationViewer = false }) {
  const address = new URL(route, site).href;
  const pageTitle = title ? title + ' | ' + brand : brand;
  const og = (key, value) => `<meta property="og:${key}" content="${esc(value)}">`;
  const twitter = (key, value) => `<meta name="twitter:${key}" content="${esc(value)}">`;
  const shareImage = cover ? new URL('images/' + cover, site).href : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#211A2C">
<link rel="icon" type="image/png" sizes="32x32" href="${base}assets/brand/favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="${base}assets/brand/apple-touch-icon.png">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
${preview || route === '404.html' ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${address}">`}
${og('site_name', brand)}${og('type', 'website')}${og('locale', 'ja_JP')}
${og('title', pageTitle)}${og('description', description)}${og('url', address)}
${twitter('card', 'summary')}${twitter('title', pageTitle)}${twitter('description', description)}
${shareImage ? og('image', shareImage) + og('image:alt', title + 'のカバー') +
  twitter('image', shareImage) + twitter('image:alt', title + 'のカバー') : ''}
<link rel="stylesheet" href="${base}assets/style.css">
${script ? `<script src="${base}assets/filter.js" defer></script>` : ''}${illustrationViewer ? `<script src="${base}assets/character-viewer.js" defer></script>` : ''}
</head>
<body>
<a class="skip" href="#main">本文へ移動</a>
<header class="header"><div class="wrap header-inner">
<a class="logo" href="${base}" aria-label="${brand} ホーム"><img src="${base}assets/brand/site-logo.png" width="2172" height="724" alt=""></a>
<nav aria-label="メインメニュー">${sections.map(([label, url]) =>
  `<a href="${base + url}"${active === label ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</div></header>
${preview ? '<p class="preview-note">確認用プレビュー｜作品の公開情報は確認中です</p>' : ''}
<main id="main">${body}</main>
<footer class="footer"><div class="wrap footer-inner">
<a class="logo" href="${base}" aria-label="${brand} ホーム"><img src="${base}assets/brand/site-logo.png" width="2172" height="724" alt=""></a>
<a href="${base}about/">ブランドについて</a><small>© ÉTERNOA : AMOUR</small>
</div></footer>
</body></html>
`;
}
function coverImage(work, base, priority = false) {
  return `<img class="cover" src="${base}images/${esc(work.cover)}" alt="${esc(work.title)}のカバー"
  width="1254" height="1254" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
function card(work, base) {
  const cardBody = `${work.cover ? coverImage(work, base) : ''}
  <div class="card-info">${work.genres?.length ? '<p class="tags">' + esc(work.genres.join(' / ')) + '</p>' : ''}
  ${isUpcoming(work) ? '<p class="tags">公開予定</p>' : ''}
  <h3>${esc(work.title)}</h3></div>`;
  return `<li class="card" data-title="${esc(work.title)}" data-characters="${esc(JSON.stringify(names(work)))}"
  data-genres="${esc(JSON.stringify(work.genres ?? []))}" data-relationships="${esc(JSON.stringify(work.relationships ?? []))}">
  ${isUpcoming(work) ? cardBody : '<a class="card-link" href="' + base + workUrl(work) + '">' + cardBody + '</a>'}
  ${work.summary ? '<p class="card-summary">' + esc(work.summary) + '</p>' : ''}</li>`;
}
const grid = (items, base) => '<ul class="cards">' + items.map(work => card(work, base)).join('') + '</ul>';
const empty = message => '<p class="empty">' + message + '</p>';
function newsList(items, base) {
  return items.length ? '<ul class="news-list">' + items.map(item =>
    `<li><time datetime="${item.date}">${item.date.replaceAll('-', '.')}</time>
      <div><p class="news-title">${detailIds.has(item.workId)
        ? `<a href="${base}titles/${item.workId}/">${esc(item.title)}</a>` : esc(item.title)}</p>
      ${item.body ? paragraphs(item.body) : ''}</div></li>`).join('') + '</ul>' : empty('お知らせはまだありません。');
}
const latest = visible.find(work => work.status === 'published') ?? (preview ? visible.find(work => work.cover && !isUpcoming(work)) : null);
const brandIntro = '<p>ÉTERNOA : AMOURは、Talelynxで公開するオリジナル恋愛作品を集めた、ÉTERNOAの姉妹ブランドです。</p>';

function write(route, config) {
  const file = join(staging, route, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, layout({ route, ...config }).replace(/[ \t]+$/gm, ''));
}
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
const missingPageBase = preview ? '/' : new URL(site).pathname;
writeFileSync(join(staging, '404.html'), layout({
  base: missingPageBase, route: '404.html', title: 'ページが見つかりません',
  description: '指定されたページは見つかりませんでした。',
  body: `<section class="wrap section">
    <div class="section-top"><h1>ページが見つかりません</h1></div>
    ${button(missingPageBase + 'titles/', '作品一覧へ')}
  </section>`
}).replace(/[ \t]+$/gm, ''));
write('', { base: './', active: 'HOME', body: `
<section class="hero"><div class="wrap hero-inner${latest ? '' : ' hero-solo'}">
  <div class="hero-copy">
    <h1><span>物語の数だけ、</span><span>恋がある。</span></h1>
    ${latest ? `<div class="featured"><p class="eyebrow" lang="en">${latest.status === 'published' ? 'Latest Release' : 'Featured Title'}</p>
    <h2>${esc(latest.title)}</h2>
    ${latest.summary ? '<p>' + esc(latest.summary) + '</p>' : latest.tagline ? '<p class="tagline">' + esc(latest.tagline) + '</p>' : ''}
    ${button(workUrl(latest), '作品を見る')}</div>` : button('titles/', '作品一覧へ')}
  </div>
  ${latest ? `<a class="hero-cover" href="${workUrl(latest)}">${coverImage(latest, './', true)}</a>` : ''}
</div></section>
<section class="wrap section"><div class="section-top">${heading('Romance Collection', '作品一覧')}${visible.length ? button('titles/', 'すべての作品') : ''}</div>
${visible.length ? grid(visible.slice(0, 4), './') : empty('掲載作品は準備中です。')}</section>
<section class="news-band"><div class="wrap section"><div class="section-top">${heading('Latest News', '最新情報')}${button('news/', 'お知らせ一覧')}</div>
${newsList(updates.slice(0, 3), './')}</div></section>
<section class="wrap section about-home">${heading('About', 'ブランド紹介')}${brandIntro}${button('about/', 'ブランドについて')}</section>` });

function select(key, label, options) {
  return `<label>${label}<select name="${key}"><option value="">すべて</option>${
    [...new Set(options)].sort((a, b) => a.localeCompare(b, 'ja')).map(value =>
      `<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select></label>`;
}
write('titles/', { base: '../', active: 'TITLES', title: '作品一覧', script: true, body: `
<section class="wrap section titles-page">${heading('Romance Collection', '作品一覧', 'h1')}
<form class="filters" role="search" hidden>
<label>作品名・キャラクター名<input name="query" type="search" placeholder="タイトル・名前で検索"></label>
${select('genres', 'ジャンル', visible.flatMap(work => work.genres ?? []))}
${select('relationships', '関係性', visible.flatMap(work => work.relationships ?? []))}
<div class="filter-footer"><p class="result-count" role="status"></p><button type="reset">クリア</button></div></form>
${visible.length ? grid(visible, '../') : empty('掲載作品は準備中です。')}</section>` });
write('news/', { base: '../', active: 'NEWS', title: '更新情報',
  body: `<section class="wrap section">${heading('News', '更新情報', 'h1')}${newsList(updates, '../')}</section>` });
write('about/', { base: '../', active: 'ABOUT', title: 'ブランド紹介',
  body: `<section class="wrap section about-page">${heading('About', 'ブランド紹介', 'h1')}
  <div class="about-panel">${wordmark}<p class="about-motto">${motto}</p>
  <p class="hero-brand" lang="en">Every Love, A Story.</p>${brandIntro}
  ${button(sister, '姉妹ブランド ÉTERNOA')}</div></section>` });

function playLink(url, rating, label = 'PLAY ON TALELYNX') {
  if (!url) return '';
  return `<div class="play">${button(url, label, 'aria-describedby="play-note"')}
    <p id="play-note">Talelynxでの閲覧にはログインが必要な場合があります。${rating === 'r18' ?
    ' R18作品は年齢確認や閲覧設定が必要な場合があります。Talelynxの画面に沿ってお進みください。' : ''}</p></div>`;
}
function portrait(person, base) {
  return person.image ? `<img class="portrait" src="${base}images/${esc(person.image)}"
    alt="${esc(person.imageAlt ?? person.name)}" loading="lazy" decoding="async">` : '';
}
function profile(person, base, level) {
  const name = esc(person.name);
  const nameBreak = level === 'h3' && person.id === 'ashley' ? name.lastIndexOf('・') + 1 : 0;
  const displayName = nameBreak ? name.slice(0, nameBreak) + '<wbr>' + name.slice(nameBreak) : name;
  return `<article class="character-profile${person.image ? ' with-portrait' : ''}">
  ${portrait(person, base)}<div class="profile-copy">
  <${level} id="character-name-${person.id}">${displayName}</${level}>
  ${person.profile ? '<div class="profile-facts">' + paragraphs(person.profile) + '</div>' : ''}
  ${person.quote ? '<blockquote>' + esc(person.quote) + '</blockquote>' : ''}
  ${person.introduction ? paragraphs(person.introduction) : ''}
  </div></article>`;
}
function illustratedCharacters(work, base) {
  const cast = new Map(characters(work).map(person => [person.id, person.name]));
  const panels = work.characterIllustrations.map(panel => {
    const label = esc(panel.characterIds.map(id => cast.get(id)).join(' × '));
    const image = base + 'images/' + esc(panel.image);
    return `<li><a class="character-illustration" href="${image}" aria-label="${label}の紹介画像を拡大">
      <img src="${image}" width="${panel.width}" height="${panel.height}" alt="${label}の紹介画像"
      loading="lazy" decoding="async"></a></li>`;
  }).join('');
  return `<section class="detail-section illustrated-characters" id="characters">
  ${heading('Characters', '登場人物')}<p class="illustration-hint">画像を選ぶと拡大できます</p>
  <ul>${panels}</ul>
  <dialog class="character-viewer" aria-label="キャラクター紹介画像">
    <div class="viewer-controls">
      <button type="button" class="viewer-zoom" aria-pressed="false">拡大</button>
      <form method="dialog"><button type="submit">閉じる</button></form>
    </div>
    <div class="viewer-scroll" tabindex="0" role="region" aria-label="拡大画像"></div>
  </dialog>
  </section>`;
}
function characterSection(work, base) {
  if (work.characterDisplay === 'illustrations') return illustratedCharacters(work, base);
  const cast = characters(work);
  if (!cast.length) return work.character?.trim()
    ? `<section class="detail-section" id="characters">${heading('Character', '登場人物')}${paragraphs(work.character)}</section>` : '';
  const content = cast.length === 1
    ? profile(cast[0], base, 'h3') + (cast[0].talelynxUrl
      ? button(base + characterUrl(work, cast[0]), '個別ルートを見る') : '')
    : `<ul class="character-grid">${cast.map(person => `<li>
      <a class="character-card" href="${base + characterUrl(work, person)}">
      ${portrait(person, base)}<span><strong>${esc(person.name)}</strong><span>プロフィール <span aria-hidden="true">→</span></span></span>
      </a></li>`).join('')}</ul>`;
  return `<section class="detail-section" id="characters">${heading('Character', '登場人物')}${content}</section>`;
}
for (const work of detailWorks) {
  const base = '../../';
  const detail = (label, japanese, value) => value?.trim() ?
    `<section class="detail-section">${heading(label, japanese)}${paragraphs(value)}</section>` : '';
  const play = work.status === 'published' && work.showTalelynxLink === true
    ? playLink(work.talelynxUrl, work.rating) : '';
  write(workUrl(work), { base, title: work.title, description: work.summary ?? work.story?.split(/\n+/)[0] ?? work.title, cover: work.cover, illustrationViewer: work.characterDisplay === 'illustrations', body: `
  <section class="detail-hero"><div class="wrap">
  <a class="back" href="../">← 作品一覧</a><div class="detail-intro${work.cover ? '' : ' text-only'}">
  ${work.cover ? coverImage(work, base, true) : ''}<div>
  ${work.rating === 'r18' ? '<p class="rating">R18 · Talelynx</p>' : ''}
  <h1>${esc(work.title)}</h1>
  ${work.characterName || characters(work).length === 1
    ? '<p class="character-name">' + esc(work.characterName || characters(work)[0].name) + '</p>' : ''}
  ${work.genres?.length ? '<p class="tags">' + esc(work.genres.join(' / ')) + '</p>' : ''}
  ${work.tagline ? '<p class="tagline">' + esc(work.tagline) + '</p>' : ''}
  ${play}</div></div></div></section>
  <div class="wrap detail-body">
  ${detail('Story', 'あらすじ', work.story ?? work.summary)}
  ${characterSection(work, base)}
  ${detail('World', '世界観', work.world)}
  ${detail('Relationship', '関係性', work.relationship ?? work.relationships?.join(' / '))}
  ${work.gallery?.length ? `<section class="detail-section">${heading('Gallery', 'ギャラリー')}
  <div class="gallery">${work.gallery.map(item => `<img src="${base}images/${esc(item.image)}"
  alt="${esc(item.alt ?? '')}" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}
  </div>` });
  for (const person of characters(work)) {
    if (work.characterDisplay === 'illustrations' && !person.talelynxUrl) continue;
    const characterBase = '../../../../';
    const rating = person.rating ?? work.rating;
    const routeLink = work.status === 'published' && person.showTalelynxLink !== false ? person.talelynxUrl : undefined;
    write(characterUrl(work, person), {
      base: characterBase,
      title: person.name + ' | ' + work.title,
      description: person.introduction ?? work.summary ?? work.title,
      body: `<section class="wrap section character-page">
      <a class="character-back" href="../../#characters">← ${esc(work.title)}の登場人物</a>
      ${profile(person, characterBase, 'h1')}
      ${routeLink ? `<div class="character-route">${rating === 'r18' ? '<p class="rating">R18 · Talelynx</p>' : ''}
        ${playLink(routeLink, rating, 'PLAY ROUTE ON TALELYNX')}</div>` : ''}
      </section>`
    });
  }
}
function copy(from, to) {
  const target = join(staging, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(from, target);
}
for (const name of ['style.css', 'filter.js', 'brand/favicon.png', 'brand/apple-touch-icon.png', 'brand/site-logo.png']) copy('source/' + name, 'assets/' + name);
if (detailWorks.some(work => work.characterDisplay === 'illustrations')) copy('source/character-viewer.js', 'assets/character-viewer.js');
for (const work of visible) {
  const images = isUpcoming(work) ? [work.cover].filter(Boolean) : [work.cover, ...(work.gallery ?? []).map(item => item.image),
    ...characters(work).map(person => person.image),
    ...(work.characterIllustrations ?? []).map(panel => panel.image)].filter(Boolean);
  for (const path of new Set(images)) {
    copy('source/' + path, 'images/' + path);
  }
}
writeFileSync(join(staging, '.nojekyll'), '');
rmSync(output, { recursive: true, force: true });
renameSync(staging, output);
console.log(output + ': ' + visible.length + ' works');
