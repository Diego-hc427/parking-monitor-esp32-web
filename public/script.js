const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');
const distanceEl = document.getElementById('distance');
const stateEl = document.getElementById('state');
const updatedEl = document.getElementById('updated');
const badgeEl = document.getElementById('badge');
const thresholdEl = document.getElementById('threshold');

const socket = io();

function setConn(connected) {
  if (connected) {
    connDot.classList.remove('bg-red-500');
    connDot.classList.add('bg-green-500');
    connText.textContent = 'Conectado';
  } else {
    connDot.classList.remove('bg-green-500');
    connDot.classList.add('bg-red-500');
    connText.textContent = 'Desconectado';
  }
}

socket.on('connect', () => setConn(true));
socket.on('disconnect', () => setConn(false));

function render(payload, threshold) {
  const cm = payload?.distance_cm ?? null;
  if (cm == null) return;
  distanceEl.textContent = cm.toFixed(1) + ' cm';
  thresholdEl.textContent = 'Umbral: ' + threshold + ' cm';
  updatedEl.textContent = new Date(payload.updated_at).toLocaleString();
  if (payload.occupied) {
    stateEl.textContent = 'OCUPADO';
    stateEl.classList.remove('text-emerald-400');
    stateEl.classList.add('text-rose-400');
    badgeEl.textContent = 'Ocupado';
    badgeEl.classList.remove('bg-emerald-900/40', 'ring-emerald-700');
    badgeEl.classList.add('bg-rose-900/40', 'ring-rose-700');
  } else {
    stateEl.textContent = 'LIBRE';
    stateEl.classList.remove('text-rose-400');
    stateEl.classList.add('text-emerald-400');
    badgeEl.textContent = 'Libre';
    badgeEl.classList.remove('bg-rose-900/40', 'ring-rose-700');
    badgeEl.classList.add('bg-emerald-900/40', 'ring-emerald-700');
  }
}

let currentThreshold = 50;

socket.on('bootstrap', (data) => {
  currentThreshold = data?.threshold_cm ?? 50;
  // Render last known for A1 if present
  if (data?.spots?.A1) render(data.spots.A1, currentThreshold);
});

socket.on('reading', (payload) => {
  currentThreshold = currentThreshold || 50;
  render(payload, currentThreshold);
});
