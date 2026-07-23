/*
 * Airbnb/airline-style date range picker. Two-month calendar, click a start
 * day then an end day — everything between highlights as you hover. Posts
 * through the same hidden start_date/end_date inputs a plain <input
 * type=date> pair would have used, so no server changes are needed.
 * data-min on the .drp root (YYYY-MM-DD) disables earlier days — used on
 * trip CREATION so a new trip can't start in the past; left empty on edit
 * forms so existing/past trips stay editable.
 */
(function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const fmt = (s) => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`; };

  function init(root) {
    const trigger = root.querySelector('.drp-trigger');
    const valueEl = root.querySelector('.drp-value');
    const startInp = root.querySelector('.drp-start');
    const endInp = root.querySelector('.drp-end');
    const panel = root.querySelector('.drp-panel');
    const monthsWrap = panel.querySelector('.drp-months');
    const minStr = root.dataset.min || '';
    let start = startInp.value || null;
    let end = endInp.value || null;
    let hoverEnd = null;
    const seed = (start || minStr) ? (start || minStr).split('-').map(Number) : (() => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; })();
    let viewY = seed[0], viewM = seed[1] - 1;

    function updateLabel() {
      valueEl.textContent = start && end ? `${fmt(start)} → ${fmt(end)}` : start ? `${fmt(start)} → pick end date` : 'Select dates';
    }
    function dayClass(y, m, d) {
      const s = iso(y, m, d);
      const cls = ['drp-day'];
      if (minStr && s < minStr) cls.push('drp-disabled');
      const rEnd = end || hoverEnd;
      const lo = start && rEnd ? (start < rEnd ? start : rEnd) : null;
      const hi = start && rEnd ? (start < rEnd ? rEnd : start) : null;
      if (start === s) cls.push('drp-start');
      if (end === s) cls.push('drp-end');
      if (lo && hi && s > lo && s < hi) cls.push('drp-inrange');
      return cls.join(' ');
    }
    function renderMonth(y, m) {
      const wrap = document.createElement('div'); wrap.className = 'drp-month';
      const h = document.createElement('div'); h.className = 'drp-month-h'; h.textContent = `${MONTHS[m]} ${y}`;
      wrap.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'drp-grid';
      DOW.forEach((d) => { const e = document.createElement('div'); e.className = 'drp-dow'; e.textContent = d; grid.appendChild(e); });
      const startDow = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      for (let i = 0; i < startDow; i++) { const e = document.createElement('span'); e.className = 'drp-day drp-empty'; grid.appendChild(e); }
      for (let d = 1; d <= daysInMonth; d++) {
        const s = iso(y, m, d);
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = dayClass(y, m, d); btn.textContent = String(d);
        if (!(minStr && s < minStr)) {
          btn.addEventListener('click', () => pick(s));
          btn.addEventListener('mouseenter', () => { if (start && !end) { hoverEnd = s; renderAll(); } });
        }
        grid.appendChild(btn);
      }
      wrap.appendChild(grid);
      return wrap;
    }
    function renderAll() {
      monthsWrap.innerHTML = '';
      monthsWrap.appendChild(renderMonth(viewY, viewM));
      let y2 = viewY, m2 = viewM + 1; if (m2 > 11) { m2 = 0; y2++; }
      monthsWrap.appendChild(renderMonth(y2, m2));
    }
    function pick(s) {
      if (!start || (start && end)) { start = s; end = null; hoverEnd = null; }
      else if (s < start) { end = start; start = s; }
      else { end = s; }
      startInp.value = start || ''; endInp.value = end || '';
      updateLabel(); renderAll();
      if (start && end) setTimeout(() => { panel.hidden = true; }, 300);
    }
    panel.querySelector('.drp-prev').addEventListener('click', () => { viewM--; if (viewM < 0) { viewM = 11; viewY--; } renderAll(); });
    panel.querySelector('.drp-next').addEventListener('click', () => { viewM++; if (viewM > 11) { viewM = 0; viewY++; } renderAll(); });
    panel.querySelector('.drp-clear').addEventListener('click', () => { start = null; end = null; hoverEnd = null; startInp.value = ''; endInp.value = ''; updateLabel(); renderAll(); });
    panel.querySelector('.drp-done').addEventListener('click', () => { panel.hidden = true; });
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.drp-panel').forEach((p) => { if (p !== panel) p.hidden = true; });
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderAll();
    });
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) panel.hidden = true; });
    updateLabel();
  }
  document.querySelectorAll('.drp').forEach(init);
})();
