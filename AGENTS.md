## Cursor Cloud specific instructions

**Drawback Chess** is a Node.js chess game (Express + Socket.IO) with no build step, no database, and no external services.

### Running the app

- `npm start` or `npm run dev` — starts Express + Socket.IO server on port 3000 (configurable via `PORT` env var)
- Access at `http://localhost:3000`
- The server serves static frontend files and handles WebSocket connections for online multiplayer

### Key caveats

- There is no test framework or linter configured in the project. Standard lint/test commands (`npm test`, `npm run lint`) are not available.
- There is no build step — all frontend code is vanilla JS served as static files.
- The board flips orientation when it's Black's turn (Black pieces appear at bottom).
- Online mode requires two browser tabs/windows connecting to the same server via Socket.IO room codes.
- Game state is stored in-memory (`Map`); restarting the server clears all active games.
- See `README.md` for setup and online mode instructions.
