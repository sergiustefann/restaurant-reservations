const filtersForm = document.getElementById('filters');
const fDate = document.getElementById('f-date');
const fZone = document.getElementById('f-zone');
const fStatus = document.getElementById('f-status');
const resetBtn = document.getElementById('reset-filters');
const rowsEl = document.getElementById('rows');
const messageEl = document.getElementById('message');

const analyticsTotalEl = document.getElementById('analytics-total');
const analyticsMessageEl = document.getElementById('analytics-message');
const toggleAnalyticsBtn = document.getElementById('toggle-analytics');
const analyticsCardEl = document.getElementById('analytics-card');
const ZONE_COLORS = ['#A9805B', '#C9B79C', '#7C6A58'];
const BAR_COLOR = '#A9805B';
const charts = {};

function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
}

async function adminFetch(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.error) || 'Eroare la comunicarea cu serverul.');
  }
  return data;
}

async function loadAnalytics() {
  if (typeof Chart === 'undefined') {
    analyticsMessageEl.textContent = 'Biblioteca de grafice nu s-a putut încărca.';
    analyticsMessageEl.className = 'message message--error';
    return;
  }

  try {
    const data = await adminFetch('/api/admin/analytics');
    analyticsTotalEl.textContent = `Total rezervări active: ${data.total}`;
    analyticsMessageEl.textContent = '';

    renderChart('chart-zones', {
      type: 'doughnut',
      data: {
        labels: data.byZone.map((z) => z.name),
        datasets: [{ data: data.byZone.map((z) => z.count), backgroundColor: ZONE_COLORS }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });

    renderChart('chart-hours', {
      type: 'bar',
      data: {
        labels: data.peakHours.map((h) => h.time),
        datasets: [{ label: 'Rezervări', data: data.peakHours.map((h) => h.count), backgroundColor: BAR_COLOR }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  } catch (err) {
    analyticsMessageEl.textContent = err.message;
    analyticsMessageEl.className = 'message message--error';
  }
}

// Chart.js nu permite doua grafice pe acelasi canvas: distrugem instanta veche
// inainte de a o recrea (necesar la reincarcarea datelor dupa o anulare).
function renderChart(canvasId, config) {
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(document.getElementById(canvasId), config);
}

async function loadZoneOptions() {
  try {
    const zones = await window.api.getZones();
    zones.forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.slug;
      opt.textContent = z.name;
      fZone.appendChild(opt);
    });
  } catch (err) {
    /* filtrul rămâne doar cu "Toate" */
  }
}

async function loadReservations() {
  showMessage('');
  const params = new URLSearchParams();
  if (fDate.value) params.set('date', fDate.value);
  if (fZone.value) params.set('zone', fZone.value);
  if (fStatus.value) params.set('status', fStatus.value);

  try {
    const list = await adminFetch(`/api/admin/reservations?${params.toString()}`);
    renderRows(list);
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

function renderRows(list) {
  rowsEl.innerHTML = '';

  if (list.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'table__empty';
    td.textContent = 'Nicio rezervare pentru filtrele alese.';
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement('tr');
    if (r.status === 'cancelled') tr.classList.add('is-cancelled');

    const cells = [r.date, r.time, r.zoneName, r.name, r.partySize, r.code,
      r.status === 'active' ? 'Activă' : 'Anulată'];
    cells.forEach((value, index) => {
      const td = document.createElement('td');
      td.textContent = value;
      if (index === 5) td.className = 'mono';
      tr.appendChild(td);
    });

    const actionCell = document.createElement('td');
    if (r.status === 'active') {
      const btn = document.createElement('button');
      btn.className = 'btn btn--danger btn--small';
      btn.textContent = 'Anulează';
      btn.addEventListener('click', () => cancelReservation(r.id, btn));
      actionCell.appendChild(btn);
    } else {
      actionCell.textContent = '—';
    }
    tr.appendChild(actionCell);
    rowsEl.appendChild(tr);
  });
}

async function cancelReservation(id, btn) {
  if (!confirm('Sigur anulezi această rezervare?')) return;
  btn.disabled = true;

  try {
    const res = await adminFetch(`/api/admin/reservations/${id}/cancel`, { method: 'PATCH' });
    showMessage(res.message, 'success');
    loadReservations();
    loadAnalytics();
  } catch (err) {
    showMessage(err.message, 'error');
    btn.disabled = false;
  }
}

// Charturile sunt create cu cardul ascuns (display:none), deci au dimensiune 0
// la initializare; le redimensionam cand cardul intra in fluxul paginii.
toggleAnalyticsBtn.addEventListener('click', () => {
  const willShow = analyticsCardEl.style.display !== 'block';
  analyticsCardEl.style.display = willShow ? 'block' : 'none';
  toggleAnalyticsBtn.classList.toggle('is-open', willShow);
  toggleAnalyticsBtn.setAttribute('aria-expanded', String(willShow));
  if (willShow) {
    Object.values(charts).forEach((chart) => chart.resize());
  }
});

filtersForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loadReservations();
});

resetBtn.addEventListener('click', () => {
  fDate.value = '';
  fZone.value = '';
  fStatus.value = '';
  loadReservations();
});

loadZoneOptions();
loadReservations();
loadAnalytics();
