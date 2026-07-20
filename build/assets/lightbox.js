(function () {
  var root = document.getElementById('trip-root');
  var lb = root.querySelector('#lb'), lbImg = lb.querySelector('.lb-img'),
    lbCap = lb.querySelector('.lb-cap'), lbDots = lb.querySelector('.lb-dots'),
    lbPrev = lb.querySelector('.lb-prev'), lbNext = lb.querySelector('.lb-next');
  var cur = [], idx = 0;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  root.querySelectorAll('.viz-frame').forEach(function (fr) {
    fr.addEventListener('click', function () { openFrom(fr); });
  });
  function openFrom(fr) {
    var vps = fr.querySelectorAll('.vp');
    cur = [].map.call(vps, function (im) { return { src: im.currentSrc || im.src, cap: im.dataset.cap, credit: im.dataset.credit }; });
    idx = Math.max(0, [].findIndex.call(vps, function (im) { return im.classList.contains('on'); }));
    var multi = cur.length > 1;
    lbPrev.style.display = lbNext.style.display = multi ? 'flex' : 'none';
    lbDots.innerHTML = multi ? cur.map(function () { return '<i></i>'; }).join('') : '';
    show(); lb.hidden = false; lb.setAttribute('aria-hidden', 'false'); document.addEventListener('keydown', onKey);
  }
  function show() {
    var it = cur[idx]; lbImg.src = it.src; lbImg.alt = it.cap;
    lbCap.innerHTML = esc(it.cap) + '<span class="cr">' + esc(it.credit) + '</span>';
    var d = lbDots.children; for (var i = 0; i < d.length; i++) d[i].className = i === idx ? 'on' : '';
  }
  function move(s) { if (cur.length < 2) return; idx = (idx + s + cur.length) % cur.length; show(); }
  function close() { lb.hidden = true; lb.setAttribute('aria-hidden', 'true'); lbImg.src = ''; document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') move(1); else if (e.key === 'ArrowLeft') move(-1); }
  lbPrev.addEventListener('click', function (e) { e.stopPropagation(); move(-1); });
  lbNext.addEventListener('click', function (e) { e.stopPropagation(); move(1); });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbCap) close(); });
  var sx = 0, sy = 0;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
