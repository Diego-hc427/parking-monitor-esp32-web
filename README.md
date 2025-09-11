# Parking Monitor ESP32 + JSN-SR04T (Web + Node.js)

Interfaz web moderna y servidor en Node.js para monitorear un espacio de parqueo en tiempo real.

## Requisitos
- Node.js v18.x ya instalado (verificaste 18.20.8)
- Windows CMD o PowerShell

## Instalación (CMD / PowerShell)
1) **Descomprimir** este proyecto.
2) Abrir una terminal dentro de la carpeta del proyecto:
   ```cmd
   cd parking-monitor-esp32-web
   ```
3) **Instalar dependencias**:
   ```cmd
   npm install
   ```
4) **Configurar variables**: copiar `.env.example` a `.env` y editar si deseas:
   ```cmd
   copy .env.example .env
   ```
   - `PORT`: Puerto del servidor (por defecto 3000)
   - `API_KEY`: Token que debe enviar el ESP32
   - `THRESHOLD_CM`: Umbral en cm para considerar OCUPADO

5) **Iniciar**:
   ```cmd
   npm start
   ```
   Abre [http://localhost:3000](http://localhost:3000)

## Endpoint para el ESP32
- Método: `POST`
- URL: `http://<tu-ip>:<PORT>/api/reading`
- Body (JSON):
  ```json
  {
    "token": "changeme123",
    "distance_cm": 42.7,
    "spot_id": "A1"
  }
  ```
- Respuesta:
  ```json
  {
    "ok": true,
    "spot_id": "A1",
    "distance_cm": 42.7,
    "occupied": true,
    "updated_at": "2025-09-09T19:00:00.000Z"
  }
  ```

> Nota: El servidor calcula `occupied = distance_cm <= THRESHOLD_CM`.

## Sketch ESP32 (HTTP + WiFiClientSecure opcional)
Ejemplo rápido usando `HTTPClient` (WiFi 2.0+). Sustituye SSID/clave, IP del servidor y token. Asegúrate de adaptar la medición del JSN-SR04T según tu wiring.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_SSID";
const char* pass = "TU_PASSWORD";

const char* serverUrl = "http://192.168.1.100:3000/api/reading"; // cambia a la IP de tu PC
const char* token = "changeme123";

// Pines ejemplo JSN-SR04T (modo trigger/echo)
const int TRIG = 5;
const int ECHO = 18;

float measureDistanceCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(3);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 30000); // 30ms timeout
  float cm = duration / 58.0; // aprox. conversión
  return cm;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  WiFi.begin(ssid, pass);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi conectado!");
}

void loop() {
  // Promediar lecturas para estabilidad
  const int N = 5;
  float sum = 0;
  for (int i=0; i<N; i++) {
    sum += measureDistanceCm();
    delay(50);
  }
  float distance = sum / N;

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    String payload = String("{\"token\":\"") + token + "\",\"distance_cm\":" + String(distance,1) + ",\"spot_id\":\"A1\"}";
    int code = http.POST(payload);
    Serial.print("POST code: "); Serial.println(code);
    String resp = http.getString();
    Serial.println(resp);
    http.end();
  }

  delay(1000); // cada 1 s
}
```

## Extras
- Endpoint de salud: `GET /api/health`
- Estado actual: `GET /api/state`
- Para múltiples espacios, usa distintos `spot_id` desde varios ESP32 o un mismo ESP conmutando IDs. La interfaz actual muestra A1; puedes extender `public/index.html` para renderizar todos los spots en `bootstrap` y `reading`.
```

