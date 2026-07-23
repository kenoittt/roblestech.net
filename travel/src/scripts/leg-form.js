/*
 * Destination/flight row behavior: country -> city cascade, airline "Other…"
 * reveal, and the connecting-flight checkbox toggling its sub-fields.
 * Reads the country->cities map from a JSON script tag rendered once on the
 * page (#dest-map-data).
 */
(function () {
  const mapEl = document.getElementById('dest-map-data');
  if (!mapEl) return;
  const destByCountry = JSON.parse(mapEl.textContent);

  document.querySelectorAll('.leg-form').forEach((form) => {
    const countrySel = form.querySelector('.js-country');
    const citySel = form.querySelector('.js-city');
    if (countrySel && citySel) {
      countrySel.addEventListener('change', () => {
        const cities = destByCountry[countrySel.value] || [];
        citySel.innerHTML = cities.map((c) => `<option value="${c}">${c}</option>`).join('');
      });
    }

    form.querySelectorAll('.js-airline').forEach((sel) => {
      const other = sel.parentElement.querySelector('.js-airline-other');
      if (!other) return;
      const sync = () => { other.hidden = sel.value !== '__other__'; };
      sel.addEventListener('change', sync);
      sync();
    });

    const hasConn = form.querySelector('.js-hasconn');
    const connFields = form.querySelector('.conn-fields');
    if (hasConn && connFields) {
      hasConn.addEventListener('change', () => { connFields.hidden = !hasConn.checked; });
    }
  });
})();
