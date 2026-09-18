const OPENING_HOUR = 12;
const LAST_SLOT_HOUR = 21;
const SLOT_STEP_MINUTES = 60;

function getTimeSlots() {
  const slots = [];
  for (let m = OPENING_HOUR * 60; m <= LAST_SLOT_HOUR * 60; m += SLOT_STEP_MINUTES) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

function isValidTimeSlot(time) {
  return getTimeSlots().includes(time);
}

module.exports = {
  OPENING_HOUR,
  LAST_SLOT_HOUR,
  SLOT_STEP_MINUTES,
  getTimeSlots,
  isValidTimeSlot,
};
