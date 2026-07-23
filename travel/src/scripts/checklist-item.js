/*
 * Shared interactive-checklist-row behavior: tap the box to toggle
 * checked/unchecked (optimistic, saved via fetch), drag/swipe a row left
 * to reveal delete (Pointer Events — same gesture on mouse and touch, only
 * engages past an actual drag threshold so hover/tap never move a row).
 * Used by both the per-trip packing checklist and the reusable preset
 * checklists, parameterized by endpoint/op-names/extra body fields.
 */
export function initChecklistList(list, endpoint, extraFields, ops) {
  if (!list) return;
  const toggleOp = ops?.toggle ?? 'toggle';
  const deleteOp = ops?.delete ?? 'delete';

  const post = (op, id, extra) => {
    const body = new URLSearchParams(Object.assign({}, extraFields, { op, id }, extra || {}));
    return fetch(endpoint, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body });
  };
  const closeAll = (except) => { list.querySelectorAll('.citem.open').forEach((r) => { if (r !== except) r.classList.remove('open'); }); };

  list.addEventListener('click', (e) => {
    const toggle = e.target.closest('.js-toggle');
    const del = e.target.closest('.js-del');
    if (toggle) {
      const item = toggle.closest('.citem'); const id = item.dataset.id;
      const willBeDone = !item.classList.contains('done');
      item.classList.toggle('done', willBeDone); // optimistic
      toggle.setAttribute('aria-pressed', willBeDone ? 'true' : 'false');
      post(toggleOp, id, { done: willBeDone ? '1' : '0' }).then((r) => r.json())
        .then((j) => { if (!j || !j.ok) item.classList.toggle('done', !willBeDone); })
        .catch(() => item.classList.toggle('done', !willBeDone));
      return;
    }
    if (del) {
      const row = del.closest('.citem'); const rid = row.dataset.id;
      row.style.opacity = '.5';
      post(deleteOp, rid).then((r) => r.json())
        .then((j) => { if (j && j.ok) { row.style.height = row.offsetHeight + 'px'; row.classList.add('removing'); setTimeout(() => row.remove(), 180); } else row.style.opacity = '1'; })
        .catch(() => { row.style.opacity = '1'; });
      return;
    }
  });

  list.querySelectorAll('.citem').forEach((item) => {
    const main = item.querySelector('.citem-main');
    let x0 = null, y0 = null, dx = 0, dragging = false, active = false;
    main.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; dragging = false; active = true;
    });
    main.addEventListener('pointermove', (e) => {
      if (!active || x0 === null) return;
      dx = e.clientX - x0; const dy = e.clientY - y0;
      if (!dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { dragging = true; main.setPointerCapture(e.pointerId); }
      if (dragging) { const t = Math.max(-76, Math.min(0, dx + (item.classList.contains('open') ? -76 : 0))); main.style.transform = `translateX(${t}px)`; }
    });
    const finish = () => {
      main.style.transform = '';
      if (dragging) { if (dx < -34) { closeAll(item); item.classList.add('open'); } else if (dx > 34) item.classList.remove('open'); }
      x0 = null; y0 = null; active = false; dragging = false;
    };
    main.addEventListener('pointerup', finish);
    main.addEventListener('pointercancel', finish);
  });
}
