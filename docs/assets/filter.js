const form = document.querySelector('.filters');
const cards = [...document.querySelectorAll('.cards .card')];
const result = document.querySelector('.result-count');
const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s/g, '');
const index = cards.map(card => ({
  card,
  title: normalize(card.dataset.title),
  characters: JSON.parse(card.dataset.characters).map(normalize),
  genres: JSON.parse(card.dataset.genres),
  relationships: JSON.parse(card.dataset.relationships),
}));

function filter() {
  const values = new FormData(form);
  const query = normalize(values.get('query'));
  const genre = values.get('genres');
  const relationship = values.get('relationships');
  let count = 0;
  for (const item of index) {
    const matches = (item.title.includes(query) || item.characters.some(name => name.includes(query))) &&
      (!genre || item.genres.includes(genre)) &&
      (!relationship || item.relationships.includes(relationship));
    item.card.hidden = !matches;
    if (matches) count++;
  }
  result.textContent = count ? count + '件の作品' : '条件に一致する作品はありません。';
}

if (form && cards.length) {
  form.hidden = false;
  form.addEventListener('input', filter);
  form.addEventListener('reset', () => requestAnimationFrame(filter));
  form.addEventListener('submit', event => event.preventDefault());
  filter();
}
