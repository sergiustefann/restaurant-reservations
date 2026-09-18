const lookupForm = document.getElementById('lookup-form');
const codeInput = document.getElementById('code');
const detailsEl = document.getElementById('details');
const cancelBtn = document.getElementById('cancel-btn');
const messageEl = document.getElementById('message');

const fields = {
  name: document.getElementById('d-name'),
  party: document.getElementById('d-party'),
  date: document.getElementById('d-date'),
  time: document.getElementById('d-time'),
  zone: document.getElementById('d-zone'),
  status: document.getElementById('d-status'),
};

let currentCode = null;

function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
}

async function lookup(code) {
  showMessage('');
  detailsEl.hidden = true;

  try {
    const r = await window.api.getReservation(code);
    currentCode = r.code;

    fields.name.textContent = r.name;
    fields.party.textContent = r.partySize;
    fields.date.textContent = r.date;
    fields.time.textContent = r.time;
    fields.zone.textContent = r.zoneName;
    fields.status.textContent = r.status === 'active' ? 'Activă' : 'Anulată';

    cancelBtn.disabled = r.status !== 'active';
    cancelBtn.textContent = r.status === 'active' ? 'Anulează rezervarea' : 'Deja anulată';
    detailsEl.hidden = false;
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

async function doCancel() {
  if (!currentCode) return;
  cancelBtn.disabled = true;

  try {
    const res = await window.api.cancelReservation(currentCode);
    showMessage(res.message, 'success');
    fields.status.textContent = 'Anulată';
    cancelBtn.textContent = 'Rezervare anulată';
  } catch (err) {
    showMessage(err.message, 'error');
    cancelBtn.disabled = false;
  }
}

lookupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = codeInput.value.trim().toUpperCase();
  if (code.length < 4) {
    return showMessage('Introdu un cod valid.', 'error');
  }
  lookup(code);
});

cancelBtn.addEventListener('click', doCancel);

const urlCode = new URLSearchParams(location.search).get('code');
if (urlCode) {
  codeInput.value = urlCode.trim().toUpperCase();
  lookup(codeInput.value);
}
