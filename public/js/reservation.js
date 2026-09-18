const REFRESH_INTERVAL_MS = 15000;

const form = document.getElementById('reservation-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const partySizeInput = document.getElementById('partySize');
const dateInput = document.getElementById('date');
const zonesEl = document.getElementById('zones');
const slotsEl = document.getElementById('slots');
const slotsHint = document.getElementById('slots-hint');
const submitBtn = document.getElementById('submit-btn');
const messageEl = document.getElementById('message');

const state = {
  zoneSlug: null,
  time: null,
  slots: [],
  refreshTimer: null,
};

function todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.className = 'message';
}

function initDateField() {
  const iso = todayLocalISO();
  dateInput.min = iso;
  dateInput.value = iso;
}

async function loadZones() {
  try {
    const zones = await window.api.getZones();
    zonesEl.innerHTML = '';

    zones.forEach((zone) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zone-btn';
      btn.dataset.slug = zone.slug;

      const name = document.createElement('span');
      name.className = 'zone-btn__name';
      name.textContent = zone.name;

      const desc = document.createElement('span');
      desc.className = 'zone-btn__desc';
      desc.textContent = zone.description;

      btn.append(name, desc);
      btn.addEventListener('click', () => selectZone(zone.slug));
      zonesEl.appendChild(btn);
    });
  } catch (err) {
    showMessage('Nu am putut încărca zonele. Reîncarcă pagina.', 'error');
  }
}

function selectZone(slug) {
  state.zoneSlug = slug;
  state.time = null;

  [...zonesEl.children].forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.slug === slug);
  });

  loadAvailability();
}

async function loadAvailability() {
  clearMessage();
  if (!state.zoneSlug || !dateInput.value) return;

  try {
    const data = await window.api.getAvailability(state.zoneSlug, dateInput.value);
    state.slots = data.slots;
    renderSlots();
    startAutoRefresh();
  } catch (err) {
    slotsEl.innerHTML = '';
    showMessage(err.message, 'error');
  }
}

function renderSlots() {
  slotsHint.style.display = 'none';
  slotsEl.innerHTML = '';

  state.slots.forEach((slot) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = slot.time;

    if (!slot.available) {
      btn.classList.add('is-taken');
      btn.disabled = true;
      btn.title = 'Interval indisponibil';
    } else {
      btn.addEventListener('click', () => selectTime(slot.time));
    }

    if (slot.time === state.time) {
      btn.classList.add('is-selected');
    }
    slotsEl.appendChild(btn);
  });
}

function selectTime(time) {
  state.time = time;
  clearMessage();
  [...slotsEl.children].forEach((btn) => {
    btn.classList.toggle('is-selected', btn.textContent === time && !btn.disabled);
  });
}

// Reîmprospătează periodic sloturile; dacă ora aleasă a fost prinsă de
// altcineva între timp, o deselectăm și anunțăm clientul.
function startAutoRefresh() {
  stopAutoRefresh();
  state.refreshTimer = setInterval(async () => {
    if (!state.zoneSlug || !dateInput.value) return;
    try {
      const data = await window.api.getAvailability(state.zoneSlug, dateInput.value);
      state.slots = data.slots;

      const chosen = data.slots.find((s) => s.time === state.time);
      if (state.time && chosen && !chosen.available) {
        state.time = null;
        showMessage('Intervalul ales tocmai a fost rezervat de altcineva. Alege altul.', 'error');
      }
      renderSlots();
    } catch (err) {
      /* eroare temporară de rețea: ignorăm, reîncercăm la următorul tic */
    }
  }, REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessage();

  if (nameInput.value.trim().length < 2) {
    return showMessage('Completează numele (minim 2 caractere).', 'error');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
    return showMessage('Introdu o adresă de e-mail validă.', 'error');
  }
  if (!state.zoneSlug) {
    return showMessage('Alege o zonă.', 'error');
  }
  if (!state.time) {
    return showMessage('Alege o oră.', 'error');
  }

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    partySize: Number(partySizeInput.value),
    date: dateInput.value,
    time: state.time,
    zone: state.zoneSlug,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Se trimite...';

  try {
    const result = await window.api.createReservation(payload);
    stopAutoRefresh();
    form.reset();
    slotsEl.innerHTML = '';
    slotsHint.style.display = 'block';
    state.time = null;
    state.zoneSlug = null;
    [...zonesEl.children].forEach((btn) => btn.classList.remove('is-selected'));
    showMessage(
      `Rezervare confirmată! Codul tău este ${result.code}. Păstrează-l pentru eventuale anulări.`,
      'success'
    );
  } catch (err) {
    showMessage(err.message, 'error');
    if (err.status === 409) {
      state.time = null;
      loadAvailability();
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmă rezervarea';
  }
}

dateInput.addEventListener('change', () => {
  state.time = null;
  loadAvailability();
});
form.addEventListener('submit', handleSubmit);

initDateField();
loadZones();
