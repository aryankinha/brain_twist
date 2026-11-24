# Brain Twist 🧠⚡

A modern brain-training and arcade puzzle mobile app built with **React Native** and **Expo Router**, backed by a standalone **Express.js** leaderboard API.

---

## 🎮 Included Games

1. **Sudoku**
   - Classic 9x9 grid number placement puzzle with Easy, Medium, and Hard difficulty levels generated on-demand.
2. **Lights Out**
   - Grid logic puzzle where toggling a cell flips adjacent cells. Strategic goal: switch off all lights in minimal moves.
3. **Schulte Table**
   - Speed reading and peripheral vision test. Tap numbers in ascending order as fast as possible; Easy mode features intuitive color groupings.
4. **Sequence Memory**
   - Progressive pattern-recall challenge (Simon-style) that tests working memory through expanding tile sequences.
5. **Stroop Effect**
   - Cognitive flexibility challenge where players rapidly identify text ink colors under conflicting semantic cues.

---

## ✨ Features

- **Personalized Player Profiles**: Selectable arcade avatars and customizable player tags.
- **Global & Game Leaderboards**: Real-time rank calculations, overall point standings, and round ranking recaps.
- **Audio & Haptic Feedback**: Dynamic tactile response and arcade sound effects via `expo-haptics` and `expo-audio`.
- **Responsive Arcade Aesthetic**: Neon-inspired retro-arcade dark interface designed for handheld ergonomics.
- **Offline Resilience**: Local progress tracking and asynchronous score syncing when connected to the server.

---

## 🏗️ Repository Architecture

```
ExpoApp/
├── assets/             # Icons, audio assets (.wav), and branding graphics
├── server/             # Express.js REST API
│   ├── index.js        # Server endpoints (/health, /scores, /leaderboard)
│   ├── rankings.js     # Rank sorting and point calculation algorithms
│   ├── store.js        # Atomic file-backed persistence engine
│   └── package.json    # Server-specific dependencies
├── src/
│   ├── api.js          # API client for backend communication
│   ├── app/            # Expo Router file-based screens and navigation
│   │   ├── (tabs)/     # Primary tab screens (Home, Leaderboards)
│   │   ├── lights.js   # Lights Out game screen
│   │   ├── schulte.js  # Schulte Table game screen
│   │   ├── sequence.js # Sequence Memory game screen
│   │   ├── stroop.js   # Stroop Effect game screen
│   │   ├── sudoku.js   # Sudoku game screen
│   │   └── settings.js # Player profile & settings screen
│   ├── components/     # Reusable UI controls, avatars, modals, and art
│   ├── games/          # Core game logic and matrix manipulation modules
│   └── user-context.js # Local user state, avatars, and persistent storage
├── render.yaml         # Blueprint for 1-click cloud server deployment on Render
└── package.json        # Expo client dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 24 LTS** (the version used in CI)
- **npm**
- **Expo Go** app on iOS/Android or a physical/simulator development build

---

### 1. Client Setup (Expo Mobile App)

Install dependencies from the repository root:

```bash
npm ci
```

Start the Expo development server:

```bash
npx expo start
```

Press:
- `a` to open on an Android emulator / connected device.
- `i` to open on iOS simulator.
- `w` to run on web.
- Or scan the QR code using the **Expo Go** app.

#### Environment Variables (Client)

By default, the client points to the hosted Render server (`https://brain-twist.onrender.com`). To point to a local or custom backend, copy `.env.example`:

```bash
cp .env.example .env
```

And update `EXPO_PUBLIC_API_URL`:

```env
EXPO_PUBLIC_API_URL=http://<YOUR-LOCAL-IP>:10000
```

---

### 2. Server Setup (Leaderboard API)

The server can run completely isolated from the mobile client:

```bash
cd server
npm ci
npm start
```

By default, the server runs on `http://0.0.0.0:10000`.

#### Verify Health Check:
```bash
curl http://localhost:10000/health
# Output: {"ok":true}
```

#### Optional Environment Variables:
- `PORT`: Port to listen on (default: `10000`).
- `DATA_DIR`: Directory for atomic JSON score storage (default: `./data`).

---

### Browser and CI checks

Run `npm run web` to open the browser preview. If the hosted API has yet to deploy the web-origin update, run the API locally and set `EXPO_PUBLIC_API_URL=http://localhost:10000` in the app’s `.env`. The API accepts browser requests from local loopback origins. For a deployed web preview, set the API’s `WEB_ORIGINS` to a comma-separated list of exact origins.

Run `npm ci --prefix server` once, then `npm run check` before pushing. GitHub Actions runs the same checks on every push and pull request.

---

## ☁️ Deployment

The leaderboard server includes a [`render.yaml`](./render.yaml) specification configured with persistent storage for production deployments on [Render](https://render.com).

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
