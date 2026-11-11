const viewer = document.querySelector('.character-viewer');
const scrollArea = viewer.querySelector('.viewer-scroll');
const zoom = viewer.querySelector('.viewer-zoom');
const image = document.createElement('img');
image.alt = '';
scrollArea.append(image);

function setZoom(expanded) {
  scrollArea.classList.toggle('is-zoomed', expanded);
  zoom.setAttribute('aria-pressed', String(expanded));
  zoom.textContent = expanded ? '全体表示' : '拡大';
  scrollArea.scrollTo(0, 0);
}

let opener;
viewer.addEventListener('close', () => opener?.focus({ preventScroll: true }));

for (const link of document.querySelectorAll('.character-illustration, .gallery-image')) {
  link.addEventListener('click', event => {
    if (!viewer.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    setZoom(false);
    opener = link;
    viewer.showModal();
    scrollArea.scrollTo(0, 0);
  });
}

zoom.addEventListener('click', () => setZoom(zoom.getAttribute('aria-pressed') !== 'true'));
