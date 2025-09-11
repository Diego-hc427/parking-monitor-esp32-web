import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'changeme123';
const THRESHOLD_CM = Number(process.env.THRESHOLD_CM || 50);

// Keep latest state in memory
// Structure: { [spotId]: { distance_cm, occupied, updated_at } }
const latest = {};

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

// Get current state
app.get('/api/state', (req, res) => {
  res.json({ spots: latest, threshold_cm: THRESHOLD_CM });
});

// ESP32 ingestion endpoint
app.post('/api/reading', (req, res) => {
  try {
    const { token, distance_cm, spot_id } = req.body || {};
    if (token !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const d = Number(distance_cm);
    if (!Number.isFinite(d)) {
      return res.status(400).json({ error: 'distance_cm must be a number' });
    }
    const id = String(spot_id || 'A1');
    const occupied = d <= THRESHOLD_CM;
    const payload = {
      spot_id: id,
      distance_cm: d,
      occupied,
      updated_at: new Date().toISOString()
    };
    latest[id] = payload;
    io.emit('reading', payload);
    res.json({ ok: true, ...payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  // Send current state right away
  socket.emit('bootstrap', { spots: latest, threshold_cm: THRESHOLD_CM });
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚗 Parking monitor server on http://localhost:${PORT}`);
});
