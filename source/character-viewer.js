const viewer = document.querySelector('.character-viewer');
const image = viewer.querySelector('img');
const scrollArea = viewer.querySelector('.viewer-scroll');
const zoom = viewer.querySelector('.viewer-zoom');

function setZoom(expanded) {
  scrollArea.classList.toggle('is-zoomed', expanded);
  zoom.setAttribute('aria-pressed', String(expanded));
  zoom.textContent = expanded ? '全体表示' : '拡大';
  scrollArea.scrollTo(0, 0);
}

for (const link of document.querySelectorAll('.character-illustration')) {
  link.addEventListener('click', event => {
    if (!viewer.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    setZoom(false);
    viewer.showModal();
    scrollArea.scrollTo(0, 0);
  });
}

zoom.addEventListener('click', () => setZoom(zoom.getAttribute('aria-pressed') !== 'true'));
