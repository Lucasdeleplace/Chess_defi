const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const games = new Map();

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

io.on('connection', (socket) => {
    console.log('Client connecté:', socket.id);

    socket.on('create-game', (data) => {
        const code = generateRoomCode();
        while (games.has(code)) code = generateRoomCode();

        const difficulties = data && (data.white || data.black)
            ? { white: data.white || 'facile', black: data.black || 'facile' }
            : { white: 'facile', black: 'facile' };

        games.set(code, {
            white: socket.id,
            black: null,
            difficulties,
            state: null
        });
        socket.join(code);
        socket.roomCode = code;
        socket.role = 'white';
        socket.emit('game-created', { code, role: 'white' });
        console.log('Partie créée:', code);
    });

    socket.on('join-game', (code) => {
        const game = games.get(code?.toUpperCase());
        if (!game) {
            socket.emit('join-error', 'Code invalide');
            return;
        }
        if (game.black) {
            socket.emit('join-error', 'Partie complète');
            return;
        }
        game.black = socket.id;
        socket.join(code.toUpperCase());
        socket.roomCode = code.toUpperCase();
        socket.role = 'black';

        socket.emit('join-success', {
            code: code.toUpperCase(),
            role: 'black',
            difficulties: game.difficulties
        });
        io.to(game.white).emit('opponent-joined', { difficulties: game.difficulties });
        console.log('Joueur rejoint:', code);
    });

    socket.on('start-game', (gameState) => {
        const code = socket.roomCode;
        const game = games.get(code);
        if (!game || !game.black) return;

        game.state = gameState;
        io.to(code).emit('game-state', gameState);
    });

    socket.on('move', (gameState) => {
        const code = socket.roomCode;
        const game = games.get(code);
        if (!game) return;

        game.state = gameState;
        socket.to(code).emit('game-state', gameState);
    });

    socket.on('disconnect', () => {
        const code = socket.roomCode;
        if (code) {
            const game = games.get(code);
            if (game) {
                if (socket.role === 'white') {
                    socket.to(code).emit('opponent-left');
                    games.delete(code);
                } else {
                    socket.to(code).emit('opponent-left');
                    game.black = null;
                }
            }
        }
        console.log('Client déconnecté:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
    console.log(`Serveur sur http://${HOST}:${PORT}`);
});
