// === Config ===
const THRESHOLD_CM = 50; // mismo umbral que en tu ESP32

// === Helpers UI ===
function setConn(ok) {
  const dot = document.getElementById('conn-dot');
  const txt = document.getElementById('conn-text');
  if (!dot || !txt) return;
  dot.classList.toggle('bg-green-500', ok);
  dot.classList.toggle('bg-red-500', !ok);
  txt.textContent = ok ? 'Conectado' : 'Desconectado';
}

function pintar(spotId, distance, ts) {
  const sfx = spotId === 'A2' ? 'A2' : ''; // A1 = ids sin sufijo, A2 = ids con sufijo
  const badge = document.getElementById('badge' + sfx);
  const state = document.getElementById('state' + sfx);
  const dist  = document.getElementById('distance' + sfx);
  const thr   = document.getElementById('threshold' + sfx);
  const upd   = document.getElementById('updated' + sfx);

  const d = distance == null ? NaN : Number(distance);
  const ocupado = !isNaN(d) && d <= THRESHOLD_CM;

  if (state) state.textContent = isNaN(d) ? '—' : (ocupado ? 'OCUPADO' : 'LIBRE');
  if (dist)  dist.textContent  = isNaN(d) ? '—' : `${d.toFixed(1)} cm`;
  if (thr)   thr.textContent   = `Umbral: ${THRESHOLD_CM} cm`;
  if (upd)   upd.textContent   = ts ? new Date(ts).toLocaleString() : new Date().toLocaleTimeString();

  if (badge) {
    badge.textContent = ocupado ? 'Ocupado' : 'Libre';
    badge.className = `px-3 py-1 rounded-full text-sm ring-1 ${
      ocupado ? 'bg-red-900/40 ring-red-700' : 'bg-emerald-900/40 ring-emerald-700'
    }`;
  }
}

// === Socket.IO (preferido) ===
let socketOK = false;
try {
  const socket = io();

  socket.on('connect', () => { socketOK = true; setConn(true); });
  socket.on('disconnect', () => { socketOK = false; setConn(false); });

  // Espera objetos tipo { spot_id: 'A1'|'A2', distance_cm: 23.4, updatedAt: ... }
  socket.on('reading', (msg) => {
    if (!msg) return;
    const spot = msg.spot_id || msg.spotId;
    const dist = msg.distance_cm ?? msg.distance;
    const ts   = msg.updatedAt || msg.ts || Date.now();
    if (spot === 'A1' || spot === 'A2') pintar(spot, dist, ts);
  });
} catch (_) {
  // si no hay socket.io, seguimos con polling
}

// === Polling (respaldo) ===
async function fetchSpot(id) {
  const r = await fetch(`/api/reading?spot_id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function poll() {
  if (socketOK) return; // si hay socket, no hace falta
  try {
    const [a1, a2] = await Promise.all([fetchSpot('A1'), fetchSpot('A2')]);
    pintar('A1', a1.distance_cm ?? a1.distance, a1.updatedAt || a1.ts);
    pintar('A2', a2.distance_cm ?? a2.distance, a2.updatedAt || a2.ts);
    setConn(true);
  } catch {
    setConn(false);
  }
}

poll();
setInterval(poll, 2000);
