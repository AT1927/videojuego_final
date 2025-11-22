## Proyecto Final UCC – Backend + Game (React + Three.js)

Se trata de un juego 3D inmersivo desarrollado con React, Three.js y Node.js, desarrollado por el Ing. Gustavo Sanchez, que combina física realista, multijugador en tiempo real, 3 niveles de juego con un personaje Ninja principal, un personaje compañero y enemigos que perseguirán evitando recojas las monedas que se encuentran distribuidas por los escenarios de los 3 nivele de juego.

## Objetivos del Proyecto
- Crear un entorno 3D inmersivo con física realista usando Three.js y Cannon.js
- Implementar un sistema multijugador en tiempo real con Socket.io
- Gestionar múltiples niveles de juego (3), con datos persistentes en MongoDB y también independientes para ser almacenados y cargados desde el Frontend.
- Integrar modelos 3D exportados desde Blender al entorno web
- Aplicar arquitectura MVC en el backend y OOP en el frontend

## Características Principales
- Sistema de Niveles: Tres niveles con diferentes configuraciones de bloques y enemigos
- Recolección de Monedas: Sistema de puntos basado en recolección de premios o coins que se encuentran distribuidas por cada escenario de cada nivel. El personaje Ninja deberá recoger las coins necesarias para activar la coin Final que se encontrará justo alado del portal para pasar al siguiente nivel
- Enemigos Dinámicos: Para los 3 niveles aparecen esferas rojas enemigas que impedirán recojas las monedas para subir de nivel. En el primer nivel aparecerá un Enemigo que patrulla y te persigue para eliminarte. En el segundo nivel aparecerán 3 enemigos y en el tercer y último nivel serán 5 las esferas enemigas
- Portales: Sistema de teletransporte entre niveles. En el nivel 1 y 2 aparecerán estos portales para cambiar de nivel o escenario de juego
- Física Realista: Motor de física Cannon.js para colisiones y movimiento
- Sistema de Partículas: Efectos visuales para premios y portales
Gráficos y Audio
- Renderizado 3D: Three.js con iluminación, sombras y texturas
- Modelos 3D: Carga de modelos GLB/GLTF exportados desde Blender
- Sistema de Audio: Efectos de sonido y música ambiental con Howler.js en cercanía e interacción con el ambiente y enemigos
- Animaciones: Transiciones suaves con GSAP

--

Monorepo con dos aplicaciones principales:

- `backend`: API REST y servidor WebSocket (Socket.io) con Node.js, Express y MongoDB.
- `game-project`: Frontend 3D con React, Vite y Three.js.

---

### Requisitos

- Node.js 18+ y npm
- MongoDB (local o Atlas)

---

### Estructura

```
Projecto_final_v1/
├─ backend/            # API REST + Socket.io + scripts y datos
└─ game-project/       # Frontend 3D (React + Vite + Three.js)
```

---

### Variables de entorno

Crear `backend/.env` con:

```env
MONGO_URI=mongodb://127.0.0.1:27017/threejs_blocks
PORT=3001
API_URL=http://localhost:3001/api/blocks/batch
```

Opcionalmente, en `game-project/.env` (o `.env.local`) para apuntar al backend:

```env
VITE_API_URL=http://localhost:3001
VITE_ENEMIES_COUNT=1
```

---

### Instalación

Ejecutar en cada proyecto:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../game-project
npm install
```

---

### Ejecución en desarrollo

Usa dos terminales:

```bash
# Terminal 1: Backend
cd backend
node app.js
# Servirá en http://localhost:3001

# Terminal 2: Frontend
cd game-project
npm run dev
# Vite en http://localhost:5173 (con --host accesible en LAN)
```

Si definiste `VITE_API_URL`, el frontend consumirá la API del backend en ese origen.

---

### API REST (backend)

Base URL: `http://localhost:3001/api/blocks`

- `GET /api/blocks?level=1` → Lista bloques por nivel (campos: `name, x, y, z, level`).
- `POST /api/blocks` → Crea un bloque. Body JSON: `{ name, x, y, z, level }`.
- `POST /api/blocks/batch` → Inserta múltiples bloques. Body: `[{ name, x, y, z, level }, ...]`.
- `GET /api/blocks/ping` → Healthcheck (`{ message: "pong" }`).

Autenticación: no requerida en desarrollo. CORS habilitado para orígenes del frontend.

---

### WebSocket (multijugador)

Servidor Socket.io en el mismo puerto del backend (`http://localhost:3001`). Eventos principales:

- `new-player` → Registra e informa a otros jugadores.
- `update-position` → Broadcast de posición/rotación.
- `remove-player` → Notifica desconexiones.
- `players-update` y `existing-players` → Sincronización de estado.

Cliente de ejemplo:

```js
import { io } from 'socket.io-client'
const socket = io('http://localhost:3001')
```

---

### Datos y scripts útiles (backend)

- `backend/scripts/` → utilidades para generar/ sincronizar datos (`sync_blocks.js`, `generate_sources.js`, etc.).
- `backend/data/` → JSON de modelos y posiciones.
- `node seed.js` → carga de datos iniciales (opcional).

Consulta `backend/README.md` para detalles avanzados (niveles, exportación desde Blender, etc.).

---

### Frontend (game-project)

- Arranque: `npm run dev` (Vite). Ajusta `VITE_API_URL` si el backend corre en otra máquina/puerto.
- Tecnologías: React 19, Three.js, cannon-es, GSAP, Howler, Socket.io Client.

Estructura relevante:

```
game-project/
├─ public/            # assets (modelos, texturas, sonidos)
└─ src/
   ├─ Experience/     # Núcleo 3D (cámaras, mundo, física, recursos)
   ├─ loaders/        # Cargadores (p.ej., ToyCarLoader)
   ├─ network/        # SocketManager (cliente)
   └─ controls/       # Controles (móvil/teclado)
```

---

### Desarrollo simultáneo y puertos

- Backend: `3001`
- Frontend (Vite): `5173`

Si pruebas en red local, levanta Vite con `npm run dev -- --host` y usa `VITE_API_URL` apuntando a la IP LAN del backend, por ejemplo:

```env
VITE_API_URL=http://192.168.1.100:3001
```

---

### Solución de problemas

- Asegura que MongoDB esté corriendo y `MONGO_URI` sea accesible.
- Si el frontend no carga datos, verifica `VITE_API_URL` y la consola del navegador.
- CORS: el backend permite `origin: '*'` vía Socket.io y `cors()` en Express para desarrollo.

---

### Licencia y autoría

- Autor: Gustavo Willyn Sánchez Rodríguez — `guswillsan@gmail.com`
- Licencia: ISC (verifica archivos de licencia si aplica).

- Colaboración en mejora de funcionalidades: Edgar Andres Torres Muñoz


