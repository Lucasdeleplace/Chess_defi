## Cursor Cloud specific instructions

**Drawback Chess** is a Node.js chess game (Express + Socket.IO) with no build step, no database, and no external services.

### Running the app

- `npm start` or `npm run dev` — starts Express + Socket.IO server on port 3000 (configurable via `PORT` env var)
- Access at `http://localhost:3000`
- The server serves static frontend files and handles WebSocket connections for online multiplayer

### Project structure (SOLID architecture)

Frontend uses ES modules (`<script type="module">`):
- `js/core/` — Board state (`Board.js`), piece movement rules (`PieceRules.js`), move validation (`MoveValidator.js`)
- `js/challenges/` — Challenge definitions + handlers (`ChallengeRegistry.js`), challenge state engine (`ChallengeEngine.js`)
- `js/ui/` — Board rendering (`BoardRenderer.js`), screen navigation (`ScreenManager.js`)
- `js/network/` — Socket.IO wrapper (`NetworkManager.js`)
- `js/storage/` — localStorage persistence (`GamePersistence.js`)
- `js/GameController.js` — Main orchestrator
- `js/main.js` — Entry point

### Linting and testing

- `npm run lint` — ESLint with flat config (eslint.config.js)
- `npm run lint:fix` — auto-fix lint issues
- `npm test` — run 68 unit tests with Vitest (Board, PieceRules, MoveValidator, ChallengeEngine)
- `npm run test:watch` — watch mode

### Key caveats

- No build step — all frontend code is vanilla JS served as static files.
- The board flips orientation when it's Black's turn (Black pieces appear at bottom).
- Online mode requires two browser tabs/windows connecting to the same server via Socket.IO room codes.
- Game state is stored in-memory (`Map`) on server; restarting the server clears all active online games.
- Local games persist to localStorage and survive page refreshes.
- See `README.md` for setup and online mode instructions.
