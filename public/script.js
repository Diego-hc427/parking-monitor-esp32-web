// === Config ===
const THRESHOLD_CM = 50; // igual que en el ESP32

// === Helpers de UI ===
function setConn(state) {
  const dot = document.getElementById('conn-dot');
  const txt = document.getElementById('conn-text');
  if (!dot || !txt) return;
  if (state === 'ok') {
    dot.classList.remove('bg-red-500');
    dot.classList.add('bg-green-500');
    txt.textContent = 'Conectado';
  } else {
    dot.classList.remove('bg-green-500');
    dot.classList.add('bg-red-500');
    txt.textContent = 'Desconectado';
  }
}

function renderCard({ spotId, distance_cm, updatedAt }) {
  const isA2 = (spotId === 'A2');

  // IDs de A1 (sin sufijo) y A2 (con sufijo A2)
  const idSuffix = isA2 ? 'A2' : '';
  const elBadge     = document.getElementById('badge' + idSuffix);
  const elState     = document.getElementById('state' + idSuffix);
  const elDistance  = document.getElementById('distance' + idSuffix);
  const elThreshold = document.getElementById('threshold' + idSuffix);
  const elUpdated   = document.getElementById('updated' + idSuffix);

  if (!elState || !elDistance) return;

  const d = (distance_cm != null) ? Number(distance_cm) : NaN;
  const ocupado = !isNaN(d) && d <= THRESHOLD_CM;

  elState.textContent = isNaN(d) ? '—' : (ocupado ? 'OCCUP' : 'LIBRE');
  elDistance.textContent = isNaN(d) ? '—' : `${d.toFixed(1)} cm`;
  if (elThreshold) elThreshold.textContent = `Umbral: ${THRESHOLD_CM} cm`;
  if (elUpdated)   elUpdated.textContent   = updatedAt ? new Date(updatedAt).toLocaleString() : new Date().toLocaleTimeString();

  if (elBadge) {
    elBadge.textContent = ocupado ? 'Ocupado' : 'Libre';
    elBadge.className = `px-3 py-1 rounded-full text-sm ring-1 ${ocupado ? 'bg-red-900/40 ring-red-700' : 'bg-emerald-900/40 ring-emerald-700'}`;
  }
}

// === Socket.IO en tiempo real ===
let ioOk = false;
try {
  const socket = io();
  socket.on('connect', () => { ioOk = true; setConn('ok'); });
  socket.on('disconnect', () => { ioOk = false; setConn('down'); });

  // Evento esperado desde el server: { spot_id, distance_cm, updatedAt }
  socket.on('reading', (msg) => {
    if (!msg) return;
    // Normaliza nombres
    const spotId = msg.spot_id || msg.spotId;
    const distance_cm = msg.distance_cm ?? msg.distance;
    const updatedAt = msg.updatedAt || msg.ts || Date.now();
    if (spotId === 'A1' || spotId === 'A2') {
      renderCard({ spotId, distance_cm, updatedAt });
    }
  });
} catch (e) {
  console.warn('Socket.IO no disponible, uso polling.', e);
  setConn('down');
}

// === Fallback por polling (por si falla Socket.IO) ===
async function fetchSpot(spotId) {
  const res = await fetch(`/api/reading?spot_id=${encodeURIComponent(spotId)}`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function poll() {
  if (ioOk) return; // Si hay socket, no hace falta
  try {
    const [a1, a2] = await Promise.all([fetchSpot('A1'), fetchSpot('A2')]);
    renderCard({ spotId: 'A1', distance_cm: a1.distance_cm ?? a1.distance, updatedAt: a1.updatedAt || a1.ts });
    renderCard({ spotId: 'A2', distance_cm: a2.distance_cm ?? a2.distance, updatedAt: a2.updatedAt || a2.ts });
    setConn('ok');
  } catch (e) {
    setConn('down');
    // Limpia UI si falla
    ['','A2'].forEach(sfx => {
      const elState = document.getElementById('state'+sfx);
      const elDistance = document.getElementById('distance'+sfx);
      const elBadge = document.getElementById('badge'+sfx);
      if (elState) elState.textContent = '—';
      if (elDistance) elDistance.textContent = '—';
      if (elBadge) { elBadge.textContent = '—'; elBadge.className = 'px-3 py-1 rounded-full text-sm bg-slate-800 ring-1 ring-slate-700'; }
    });
  }
}

poll();
setInterval(poll, 2000);
