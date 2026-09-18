async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error((data && data.error) || 'A apărut o eroare de rețea.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function getZones() {
  return request('/api/zones');
}

function getAvailability(zoneSlug, date) {
  const params = new URLSearchParams({ zone: zoneSlug, date });
  return request(`/api/availability?${params.toString()}`);
}

function createReservation(payload) {
  return request('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function getReservation(code) {
  return request(`/api/reservations/${encodeURIComponent(code)}`);
}

function cancelReservation(code) {
  return request('/api/reservations/cancel', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

window.api = {
  getZones,
  getAvailability,
  createReservation,
  getReservation,
  cancelReservation,
};
