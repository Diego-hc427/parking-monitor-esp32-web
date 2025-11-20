// === Helpers UI ===

// Cambia el estado del indicador de conexión
function setConn(ok) {
  const dot = document.getElementById('conn-dot');
  const txt = document.getElementById('conn-text');
  if (!dot || !txt) return;

  dot.classList.toggle('bg-green-500', ok);
  dot.classList.toggle('bg-red-500', !ok);
  txt.textContent = ok ? 'Conectado' : 'Desconectado';
}

// Según el spotId, devuelve los IDs correctos del DOM
function resolveIds(spotId) {
  if (spotId === 'A1') return { sufijo: '' };
  if (spotId === 'A2') return { sufijo: 'A2' };
  if (spotId === 'A3') return { sufijo: 'A3' };
  return { sufijo: '' };
}

// Pinta una tarjeta por spot (A1/A2/A3)
function pintar(spotId, distance, ocupado, ts) {
  const { sufijo } = resolveIds(spotId);

  const badge = document.getElementById('badge' + sufijo);
  const state = document.getElementById('state' + sufijo);
  const dist  = document.getElementById('distance' + sufijo);
  const upd   = document.getElementById('updated' + sufijo);

  const d = distance == null ? NaN : Number(distance);

  if (state) state.textContent = ocupado ? 'OCUPADO' : 'LIBRE';
  if (dist)  dist.textContent  = isNaN(d) ? '—' : `${d.toFixed(1)} cm`;

  if (upd) {
    const date = ts ? new Date(ts) : new Date();
    upd.textContent = date.toLocaleString();
  }

  if (badge) {
    badge.textContent = ocupado ? 'Ocupado' : 'Libre';
    badge.className = `px-3 py-1 rounded-full text-sm ring-1 ${
      ocupado ? 'bg-red-900/40 ring-red-700' : 'bg-emerald-900/40 ring-emerald-700'
    }`;
  }
}

// === Socket.IO ===
let socketOK = false;

try {
  const socket = io();

  socket.on('connect', () => {
    socketOK = true;
    setConn(true);
  });

  socket.on('disconnect', () => {
    socketOK = false;
    setConn(false);
  });

  // Mensajes directos del servidor
  socket.on('reading', (msg) => {
    if (!msg) return;

    const spot = msg.spot_id;
    const dist = msg.distance_cm;
    const occ  = msg.occupied;  // <---- USANDO occupied DEL SERVIDOR
    const ts   = msg.updated_at || msg.updatedAt || Date.now();

    if (spot === 'A1' || spot === 'A2' || spot === 'A3') {
      pintar(spot, dist, occ, ts);
    }
  });

  // Bootstrap inicial
  socket.on('bootstrap', ({ spots }) => {
    Object.values(spots).forEach((item) => {
      pintar(item.spot_id, item.distance_cm, item.occupied, item.updated_at);
    });
  });

} catch (err) {
  console.warn("Socket.IO no disponible, usando polling.", err);
}

// === Polling (solo si socket falla) ===

async function fetchStatus() {
  const r = await fetch('/api/state');
  if (!r.ok) throw new Error('Error HTTP ' + r.status);
  return r.json();
}

async function poll() {
  if (socketOK) return;
  try {
    const data = await fetchStatus();

    if (data.spots) {
      const spots = data.spots;

      if (spots.A1) pintar('A1', spots.A1.distance_cm, spots.A1.occupied, spots.A1.updated_at);
      if (spots.A2) pintar('A2', spots.A2.distance_cm, spots.A2.occupied, spots.A2.updated_at);
      if (spots.A3) pintar('A3', spots.A3.distance_cm, spots.A3.occupied, spots.A3.updated_at);
    }

    setConn(true);
  } catch (err) {
    setConn(false);
  }
}

poll();
setInterval(poll, 2000);
