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
const ids = new Set();
for (const work of works) {
  if (!validId(work.id) || ids.has(work.id)) {
    throw new Error('作品IDを確認してください: ' + work.id);
  }
  ids.add(work.id);
  if (!['published', 'coming-soon', 'private'].includes(work.status)) throw new Error(work.id + ': status');
  const characterIds = new Set();
  for (const person of characters(work)) {
    if (!validId(person.id) || characterIds.has(person.id) || !person.name?.trim()) {
      throw new Error(work.id + ': 人物IDと名前を確認してください。');
    }
    characterIds.add(person.id);
    if (person.image) asset(person.image);
    if (person.talelynxUrl && !talelynxLink(person.talelynxUrl)) throw new Error(work.id + ': 人物ルートURL');
    if (person.rating && !['all-ages', 'r18'].includes(person.rating)) throw new Error(work.id + ': 人物ルートのrating');
  }
  if (work.talelynxUrl && !talelynxLink(work.talelynxUrl)) throw new Error(work.id + ': Talelynx作品URL');
  if (work.status === 'published' && (!work.title?.trim() || !names(work).some(name => name.trim()) ||
      !work.cover || !work.summary?.trim() || !validDate(work.publishedAt) ||
      !(work.talelynxUrl || characters(work).some(person => person.talelynxUrl)))) {
    throw new Error(work.id + ': タイトル、人物名、正式カバー、紹介文、公開日、Talelynxの作品URLまたは個別ルートURLが必要です。');
  }
  if (work.updatedAt && !validDate(work.updatedAt)) throw new Error(work.id + ': updatedAt');
  if (work.rating && !['all-ages', 'r18'].includes(work.rating)) throw new Error(work.id + ': rating');
  if (work.cover) asset(work.cover);
  for (const item of work.gallery ?? []) asset(item.image);
}
for (const item of news) {
  if (!validDate(item.date) || !item.title?.trim() || (item.workId && !ids.has(item.workId))) {
    throw new Error('お知らせの日付・見出し・作品IDを確認してください。');
  }
}

const visible = works.filter(work => work.status === 'published' || (preview && (work.cover || work.previewOnly)));
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

function layout({ base, route, active, title, description = motto, cover, body, script = false }) {
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
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
${preview ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${address}">`}
${og('site_name', brand)}${og('type', 'website')}${og('locale', 'ja_JP')}
${og('title', pageTitle)}${og('description', description)}${og('url', address)}
${twitter('card', 'summary')}${twitter('title', pageTitle)}${twitter('description', description)}
${shareImage ? og('image', shareImage) + og('image:alt', title + 'のカバー') +
  twitter('image', shareImage) + twitter('image:alt', title + 'のカバー') : ''}
<link rel="stylesheet" href="${base}assets/style.css">
${script ? `<script src="${base}assets/filter.js" defer></script>` : ''}
</head>
<body>
<a class="skip" href="#main">本文へ移動</a>
<header class="header"><div class="wrap header-inner">
<a class="logo" href="${base}" aria-label="${brand} ホーム">${wordmark}</a>
<nav aria-label="メインメニュー">${sections.map(([label, url]) =>
  `<a href="${base + url}"${active === label ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</div></header>
${preview ? '<p class="preview-note">確認用プレビュー｜作品の公開情報は確認中です</p>' : ''}
<main id="main">${body}</main>
<footer class="footer"><div class="wrap footer-inner">
<a class="logo" href="${base}" aria-label="${brand} ホーム">${wordmark}</a>
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
  return `<li class="card" data-title="${esc(work.title)}" data-characters="${esc(JSON.stringify(names(work)))}"
  data-genres="${esc(JSON.stringify(work.genres ?? []))}" data-relationships="${esc(JSON.stringify(work.relationships ?? []))}">
  <a class="card-link" href="${base + workUrl(work)}">${work.cover ? coverImage(work, base) : ''}
  <div class="card-info">${work.genres?.length ? '<p class="tags">' + esc(work.genres.join(' / ')) + '</p>' : ''}
  <h3>${esc(work.title)}</h3></div></a>
  ${work.summary ? '<p class="card-summary">' + esc(work.summary) + '</p>' : ''}</li>`;
}
const grid = (items, base) => '<ul class="cards">' + items.map(work => card(work, base)).join('') + '</ul>';
const empty = message => '<p class="empty">' + message + '</p>';
function newsList(items, base) {
  return items.length ? '<ul class="news-list">' + items.map(item =>
    `<li><time datetime="${item.date}">${item.date.replaceAll('-', '.')}</time>
      <div><p class="news-title">${item.workId
        ? `<a href="${base}titles/${item.workId}/">${esc(item.title)}</a>` : esc(item.title)}</p>
      ${item.body ? paragraphs(item.body) : ''}</div></li>`).join('') + '</ul>' : empty('お知らせはまだありません。');
}
const latest = visible.find(work => work.status === 'published') ?? (preview ? visible[0] : null);
const brandIntro = '<p>ÉTERNOA : AMOURは、Talelynxで公開するオリジナル恋愛作品を集めた、ÉTERNOAの姉妹ブランドです。</p>';

function write(route, config) {
  const file = join(staging, route, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, layout({ route, ...config }).replace(/[ \t]+$/gm, ''));
}
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
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
function characterSection(work, base) {
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
for (const work of visible) {
  const base = '../../';
  const detail = (label, japanese, value) => value?.trim() ?
    `<section class="detail-section">${heading(label, japanese)}${paragraphs(value)}</section>` : '';
  const play = work.status === 'published' ? playLink(work.talelynxUrl, work.rating) : '';
  write(workUrl(work), { base, title: work.title, description: work.summary ?? work.title, cover: work.cover, body: `
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
    const characterBase = '../../../../';
    const rating = person.rating ?? work.rating;
    const routeLink = work.status === 'published' ? person.talelynxUrl : undefined;
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
for (const name of ['style.css', 'filter.js']) copy('source/' + name, 'assets/' + name);
for (const work of visible) {
  const images = [work.cover, ...(work.gallery ?? []).map(item => item.image),
    ...characters(work).map(person => person.image)].filter(Boolean);
  for (const path of new Set(images)) {
    copy('source/' + path, 'images/' + path);
  }
}
writeFileSync(join(staging, '.nojekyll'), '');
rmSync(output, { recursive: true, force: true });
renameSync(staging, output);
console.log(output + ': ' + visible.length + ' works');
