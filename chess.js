// Configuration du jeu - Drawback Chess
const BOARD_SIZE = 8;
const PIECES = {
    WHITE_KING: '♔',
    WHITE_QUEEN: '♕',
    WHITE_ROOK: '♖',
    WHITE_BISHOP: '♗',
    WHITE_KNIGHT: '♘',
    WHITE_PAWN: '♙',
    BLACK_KING: '♚',
    BLACK_QUEEN: '♛',
    BLACK_ROOK: '♜',
    BLACK_BISHOP: '♝',
    BLACK_KNIGHT: '♞',
    BLACK_PAWN: '♟'
};

class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameOver = false;
        // Match & défis
        this.matchState = { whiteDifficulty: 'facile', blackDifficulty: 'facile', whiteChallenge: null, blackChallenge: null };
        this.moveCount = 0;
        this.pawnMovedCount = { white: 0, black: 0 };
        this.activatedPawnIds = { white: new Set(), black: new Set() };
        this.lastPieceType = { white: null, black: null };
        this.kingMovedLastTurns = { white: 0, black: 0 };
        this.mustContinueCapture = { white: false, black: false };
        this.touchedTargetSquares = { white: { d8: false, e8: false }, black: { d1: false, e1: false } };
        this.pieceMoveCount = {}; // "row-col" -> count
        this.frozenPieceTypes = { white: {}, black: {} }; // type -> turns remaining
        this.lavaRow = null;
        this.targetSquare = null;
        this.pieceTypeOrder = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
        this.pieceTypeIndex = { white: 0, black: 0 };
        this.onlineMode = false;
        this.myRole = null;
        this.socket = null;
        this.enPassantTarget = null;
        this.castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
        this.lastLandingSquareColor = { white: null, black: null }; // Alternance : couleur de la case d'arrivée du dernier coup
        this.init();
    }

    initializeBoard() {
        const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        
        // Pièces noires
        board[0][0] = { type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK };
        board[0][1] = { type: 'knight', color: 'black', symbol: PIECES.BLACK_KNIGHT };
        board[0][2] = { type: 'bishop', color: 'black', symbol: PIECES.BLACK_BISHOP };
        board[0][3] = { type: 'queen', color: 'black', symbol: PIECES.BLACK_QUEEN };
        board[0][4] = { type: 'king', color: 'black', symbol: PIECES.BLACK_KING };
        board[0][5] = { type: 'bishop', color: 'black', symbol: PIECES.BLACK_BISHOP };
        board[0][6] = { type: 'knight', color: 'black', symbol: PIECES.BLACK_KNIGHT };
        board[0][7] = { type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK };
        for (let i = 0; i < BOARD_SIZE; i++) {
            board[1][i] = { type: 'pawn', color: 'black', symbol: PIECES.BLACK_PAWN };
        }

        // Pièces blanches
        board[7][0] = { type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK };
        board[7][1] = { type: 'knight', color: 'white', symbol: PIECES.WHITE_KNIGHT };
        board[7][2] = { type: 'bishop', color: 'white', symbol: PIECES.WHITE_BISHOP };
        board[7][3] = { type: 'queen', color: 'white', symbol: PIECES.WHITE_QUEEN };
        board[7][4] = { type: 'king', color: 'white', symbol: PIECES.WHITE_KING };
        board[7][5] = { type: 'bishop', color: 'white', symbol: PIECES.WHITE_BISHOP };
        board[7][6] = { type: 'knight', color: 'white', symbol: PIECES.WHITE_KNIGHT };
        board[7][7] = { type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK };
        for (let i = 0; i < BOARD_SIZE; i++) {
            board[6][i] = { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN };
        }

        return board;
    }

    init() {
        document.getElementById('start-match-btn').addEventListener('click', () => this.startMatch());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        document.getElementById('next-game-btn').addEventListener('click', () => this.nextGame());

        document.getElementById('mode-local-btn').addEventListener('click', () => this.showScreen('setup'));
        document.getElementById('mode-online-btn').addEventListener('click', () => this.showOnlineLobby());
        document.getElementById('back-to-mode-btn').addEventListener('click', () => this.showScreen('mode'));
        document.getElementById('create-game-btn').addEventListener('click', () => this.createOnlineGame());
        document.getElementById('join-game-btn').addEventListener('click', () => this.joinOnlineGame());
        document.querySelectorAll('.promo-btn').forEach(btn => {
            btn.addEventListener('click', () => this.completePromotion(btn.dataset.piece));
        });

        this.showScreen('mode');
    }

    showScreen(screen) {
        const modes = ['mode', 'setup', 'lobby', 'game', 'victory'];
        modes.forEach(m => {
            const el = document.getElementById(m === 'mode' ? 'mode-screen' : m === 'lobby' ? 'online-lobby' : m === 'setup' ? 'setup-screen' : m === 'game' ? 'game-screen' : 'victory-screen');
            if (el) el.style.display = 'none';
        });
        const show = screen === 'mode' ? document.getElementById('mode-screen') :
            screen === 'setup' ? document.getElementById('setup-screen') :
            screen === 'lobby' ? document.getElementById('online-lobby') :
            screen === 'game' ? document.getElementById('game-screen') :
            document.getElementById('victory-screen');
        if (show) show.style.display = screen === 'game' ? 'flex' : 'block';
    }

    showOnlineLobby() {
        document.getElementById('room-code-display').style.display = 'none';
        document.getElementById('join-error').style.display = 'none';
        this.initSocket();
        this.showScreen('lobby');
    }

    startMatch() {
        this.onlineMode = false;
        this.myRole = null;
        const whiteDiff = document.getElementById('white-difficulty').value;
        const blackDiff = document.getElementById('black-difficulty').value;
        this.assignChallenges(whiteDiff, blackDiff);
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameOver = false;
        this.resetChallengeState();
        this.showScreen('game');
        this.renderBoard();
        this.updateChallengeDisplay();
        this.updateUI();
    }

    initSocket() {
        if (this.socket?.connected) return;
        const socketUrl = typeof window !== 'undefined' && window.SOCKET_ORIGIN ? window.SOCKET_ORIGIN : undefined;
        this.socket = io(socketUrl);
        this.socket.on('game-created', (data) => {
            this.myRole = data.role;
            document.getElementById('room-code').textContent = data.code;
            document.getElementById('room-code-display').style.display = 'block';
        });
        this.socket.on('join-success', (data) => {
            this.myRole = data.role;
            this.onlineMode = true;
            this.assignChallenges(data.difficulties.white, data.difficulties.black);
            this.board = this.initializeBoard();
            this.currentPlayer = 'white';
            this.resetChallengeState();
            this.showScreen('game');
            this.renderBoard();
            this.updateChallengeDisplay();
            this.updateUI();
            document.getElementById('game-status').textContent = 'En attente que Blanc lance la partie...';
        });
        this.socket.on('opponent-joined', (data) => {
            document.querySelector('.waiting').textContent = 'Adversaire connecté !';
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.textContent = 'Lancer la partie';
            btn.style.marginTop = '10px';
            btn.onclick = () => this.startOnlineGame();
            const container = document.getElementById('room-code-display');
            if (!container.querySelector('.start-online-btn')) {
                btn.className += ' start-online-btn';
                container.appendChild(btn);
            }
        });
        this.socket.on('game-state', (state) => {
            this.applyRemoteState(state);
        });
        this.socket.on('join-error', (msg) => {
            document.getElementById('join-error').textContent = msg;
            document.getElementById('join-error').style.display = 'block';
        });
        this.socket.on('opponent-left', () => {
            if (!this.gameOver) {
                this.gameOver = true;
                const winner = this.myRole === 'white' ? 'Blanc' : 'Noir';
                this._lastVictoryReason = 'L\'adversaire a quitté la partie (abandon).';
                document.getElementById('game-status').textContent = `L'adversaire a quitté. ${winner} gagne par abandon !`;
                this.showVictoryScreen(winner);
            }
        });
    }

    createOnlineGame() {
        const whiteDiff = document.getElementById('online-white-difficulty').value;
        const blackDiff = document.getElementById('online-black-difficulty').value;
        this.socket?.emit('create-game', { white: whiteDiff, black: blackDiff });
    }

    joinOnlineGame() {
        const code = document.getElementById('join-code-input').value.trim().toUpperCase();
        if (code.length !== 6) {
            document.getElementById('join-error').textContent = 'Code invalide (6 caractères)';
            document.getElementById('join-error').style.display = 'block';
            return;
        }
        this.socket?.emit('join-game', code);
    }

    startOnlineGame() {
        this.onlineMode = true;
        const whiteDiff = document.getElementById('online-white-difficulty').value;
        const blackDiff = document.getElementById('online-black-difficulty').value;
        this.assignChallenges(whiteDiff, blackDiff);
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.resetChallengeState();
        const state = this.serializeState();
        this.socket?.emit('start-game', state);
        this.showScreen('game');
        this.renderBoard();
        this.updateChallengeDisplay();
        this.updateUI();
    }

    serializeState() {
        const board = this.board.map(row => row.map(p => p ? {
            type: p.type, color: p.color, symbol: p.symbol, _pawnId: p._pawnId
        } : null));
        return {
            board, currentPlayer: this.currentPlayer, gameOver: this.gameOver,
            matchState: this.matchState, moveCount: this.moveCount,
            activatedPawnIds: {
                white: [...this.activatedPawnIds.white],
                black: [...this.activatedPawnIds.black]
            },
            lastPieceType: this.lastPieceType, kingMovedLastTurns: this.kingMovedLastTurns,
            mustContinueCapture: this.mustContinueCapture, mustMoveBackward: this.mustMoveBackward,
            touchedTargetSquares: JSON.parse(JSON.stringify(this.touchedTargetSquares)),
            pieceMoveCount: { ...this.pieceMoveCount },
            frozenPieceTypes: JSON.parse(JSON.stringify(this.frozenPieceTypes)),
            lavaRow: this.lavaRow, targetSquare: this.targetSquare,
            pieceTypeIndex: { ...this.pieceTypeIndex },
            _capturedRookBy: { ...this._capturedRookBy },
            _lastOpponentMove: this._lastOpponentMove,
            enPassantTarget: this.enPassantTarget,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            lastLandingSquareColor: { ...this.lastLandingSquareColor }
        };
    }

    emitStateIfOnline() {
        if (this.onlineMode && this.socket?.connected) {
            const state = this.serializeState();
            state.gameStatusMessage = document.getElementById('game-status')?.textContent || '';
            if (this.gameOver && this._lastWinner) {
                state.winner = this._lastWinner;
                state.lastVictoryReason = this._lastVictoryReason;
            }
            this.socket.emit('move', state);
        }
    }

    applyRemoteState(state) {
        this.board = state.board.map(row => row.map(p => p ? { ...p } : null));
        this.currentPlayer = state.currentPlayer;
        this.gameOver = state.gameOver;
        this.matchState = state.matchState;
        this.moveCount = state.moveCount;
        this.activatedPawnIds = {
            white: new Set(state.activatedPawnIds?.white || []),
            black: new Set(state.activatedPawnIds?.black || [])
        };
        this.lastPieceType = state.lastPieceType || { white: null, black: null };
        this.kingMovedLastTurns = state.kingMovedLastTurns || { white: 0, black: 0 };
        this.mustContinueCapture = state.mustContinueCapture || { white: false, black: false };
        this.mustMoveBackward = state.mustMoveBackward || { white: false, black: false };
        this.touchedTargetSquares = state.touchedTargetSquares || { white: { d8: false, e8: false }, black: { d1: false, e1: false } };
        this.pieceMoveCount = state.pieceMoveCount || {};
        this.frozenPieceTypes = state.frozenPieceTypes || { white: {}, black: {} };
        this.lavaRow = state.lavaRow;
        this.targetSquare = state.targetSquare;
        this.pieceTypeIndex = state.pieceTypeIndex || { white: 0, black: 0 };
        this._capturedRookBy = state._capturedRookBy || { white: false, black: false };
        this._lastOpponentMove = state._lastOpponentMove;
        this.enPassantTarget = state.enPassantTarget || null;
        this.castlingRights = state.castlingRights || { white: { k: true, q: true }, black: { k: true, q: true } };
        this.lastLandingSquareColor = state.lastLandingSquareColor || { white: null, black: null };
        this.selectedSquare = null;
        this.renderBoard();
        this.updateUI();
        if (state.gameOver) {
            document.getElementById('game-status').textContent = state.gameStatusMessage || '';
            this._lastVictoryReason = state.lastVictoryReason || state.gameStatusMessage || '';
            if (state.winner) this.showVictoryScreen(state.winner);
        }
    }

    assignChallenges(whiteDiff, blackDiff) {
        const whitePool = [...CHALLENGES[whiteDiff]];
        const blackPool = [...CHALLENGES[blackDiff]];
        const wIdx = Math.floor(Math.random() * whitePool.length);
        let bIdx = Math.floor(Math.random() * blackPool.length);
        while (blackPool[bIdx]?.id === whitePool[wIdx]?.id && blackPool.length > 1) {
            bIdx = (bIdx + 1) % blackPool.length;
        }
        const whiteCh = { ...whitePool[wIdx], difficulty: whiteDiff };
        const blackCh = { ...blackPool[bIdx], difficulty: blackDiff };
        this.matchState = {
            whiteDifficulty: whiteDiff,
            blackDifficulty: blackDiff,
            whiteChallenge: whiteCh,
            blackChallenge: blackCh
        };
    }

    resetChallengeState() {
        this.moveCount = 0;
        this.pawnMovedCount = { white: 0, black: 0 };
        this.activatedPawnIds = { white: new Set(), black: new Set() };
        this.lastPieceType = { white: null, black: null };
        this.kingMovedLastTurns = { white: 0, black: 0 };
        this.mustContinueCapture = { white: false, black: false };
        this.touchedTargetSquares = { white: { d8: false, e8: false }, black: { d1: false, e1: false } };
        this.pieceMoveCount = {};
        this.frozenPieceTypes = { white: {}, black: {} };
        this.lavaRow = null;
        this.targetSquare = null;
        this.pieceTypeIndex = { white: 0, black: 0 };
        this.mustMoveBackward = { white: false, black: false };
        this._lastOpponentMove = null;
        this._capturedRookBy = { white: false, black: false };
        this.enPassantTarget = null;
        this.castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
        this.lastLandingSquareColor = { white: null, black: null };
    }

    updateChallengeDisplay() {
        const wc = this.matchState.whiteChallenge;
        const bc = this.matchState.blackChallenge;
        const panel = document.getElementById('challenges-panel');
        // Blanc = pièces en bas, Noir = pièces en haut. whiteChallenge s'applique aux Blancs, blackChallenge aux Noirs.
        const whiteInfo = document.getElementById('white-challenge-info');
        const blackInfo = document.getElementById('black-challenge-info');
        whiteInfo.innerHTML = wc ? `<strong>${wc.name}</strong><br><small>${wc.desc}</small>` : '-';
        blackInfo.innerHTML = bc ? `<strong>${bc.name}</strong><br><small>${bc.desc}</small>` : '-';
        if (this.onlineMode && this.myRole) {
            const wBox = panel.querySelector('.white-challenge');
            const bBox = panel.querySelector('.black-challenge');
            wBox.style.display = this.myRole === 'white' ? 'block' : 'none';
            bBox.style.display = this.myRole === 'black' ? 'block' : 'none';
        } else {
            const wBox = panel.querySelector('.white-challenge');
            const bBox = panel.querySelector('.black-challenge');
            wBox.style.display = '';
            bBox.style.display = '';
            wBox.classList.toggle('challenge-active', this.currentPlayer === 'white');
            bBox.classList.toggle('challenge-active', this.currentPlayer === 'black');
        }
    }

    getDisplayPerspective() {
        if (this.onlineMode && this.myRole) return this.myRole;
        return this.currentPlayer;
    }

    getDisplaySymbol(piece, row, col, perspective) {
        if (piece.type !== 'queen') return piece.symbol;
        const whiteHasDameCachee = this.matchState.whiteChallenge?.id === 'dame_cachee';
        const blackHasDameCachee = this.matchState.blackChallenge?.id === 'dame_cachee';
        const viewer = perspective !== undefined ? perspective : this.getDisplayPerspective();
        const viewerHasDameCachee = viewer === 'white' ? whiteHasDameCachee : blackHasDameCachee;
        if (viewerHasDameCachee) return '♙';
        return piece.symbol;
    }

    shouldFlipBoard() {
        if (this.onlineMode && this.myRole) return this.myRole === 'black';
        return this.currentPlayer === 'black'; // En local : vue du joueur dont c'est le tour
    }

    renderBoard() {
        const boardElement = document.getElementById('chessboard');
        boardElement.innerHTML = '';
        const flip = this.shouldFlipBoard();
        const perspective = this.getDisplayPerspective();

        const files = flip ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const wrapper = document.createElement('div');
        wrapper.className = 'board-wrapper';

        const corner = document.createElement('div');
        corner.className = 'coord coord-corner';
        wrapper.appendChild(corner);

        for (let c = 0; c < BOARD_SIZE; c++) {
            const fileEl = document.createElement('div');
            fileEl.className = 'coord coord-file';
            fileEl.textContent = files[c];
            wrapper.appendChild(fileEl);
        }

        for (let displayRow = 0; displayRow < BOARD_SIZE; displayRow++) {
            const rank = flip ? (displayRow + 1) : (8 - displayRow);
            const rankEl = document.createElement('div');
            rankEl.className = 'coord coord-rank';
            rankEl.textContent = rank;
            wrapper.appendChild(rankEl);

            for (let col = 0; col < BOARD_SIZE; col++) {
                const row = flip ? 7 - displayRow : displayRow;
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.getDisplaySymbol(piece, row, col, perspective);
                    square.classList.add(piece.color === 'white' ? 'piece-white' : 'piece-black');
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                wrapper.appendChild(square);
            }
        }

        boardElement.appendChild(wrapper);

        document.getElementById('move-number').textContent = Math.floor(this.moveCount / 2) + 1;
        this.updateChallengeAlerts();
        this.updateChallengeDisplay();
        this.updateUI();
    }

    updateChallengeAlerts() {
        const el = document.getElementById('challenge-alerts');
        const msgs = [];
        if (this.targetSquare) {
            const col = 'abcdefgh'[this.targetSquare[1]];
            const row = 8 - this.targetSquare[0];
            msgs.push(`🎯 Cible: ${col}${row}`);
        }
        if (this.lavaRow !== null) {
            msgs.push(`🌋 Lave: rangée ${8 - this.lavaRow}`);
        }
        el.textContent = msgs.length ? msgs.join(' | ') : '';
    }

    getAllValidMovesForPlayer(color) {
        const result = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const p = this.board[r][c];
                if (p && p.color === color) {
                    const moves = this.getValidMoves(r, c);
                    for (const [nr, nc] of moves) result.push({ from: [r, c], to: [nr, nc], piece: p });
                }
            }
        }
        return result;
    }

    canSelectPiece(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.currentPlayer) return false;

        const c = piece.color === 'white' ? this.matchState.whiteChallenge : this.matchState.blackChallenge;
        if (!c) return true;

        const allMoves = this.getAllValidMovesForPlayer(this.currentPlayer);

        // Manger manger : si un pion peut capturer, ne sélectionner que les pions qui capturent
        if (c.id === 'manger_manger' && piece.type === 'pawn') {
            const pawnCaptures = allMoves.filter(m => m.piece.type === 'pawn' && this.board[m.to[0]][m.to[1]]);
            if (pawnCaptures.length > 0) return this.board[row][col] && this.getValidMoves(row, col).some(([r, c]) => this.board[r][c]);
        }
        if (c.id === 'manger_manger') {
            const pawnCaptures = allMoves.filter(m => m.piece.type === 'pawn' && this.board[m.to[0]][m.to[1]]);
            if (pawnCaptures.length > 0 && piece.type !== 'pawn') return false;
        }

        // Diversité
        if (c.id === 'diversite' && this.lastPieceType[piece.color] === piece.type) return false;

        // À mon tour
        if (c.id === 'mon_tour') {
            const idx = this.pieceTypeIndex[piece.color];
            const required = this.pieceTypeOrder[idx];
            if (piece.type !== required) return false;
        }

        // Copycat : même aile (cols 0-3 = Q, 4-7 = K)
        if (c.id === 'copycat' && this.moveCount > 0) {
            const lastMove = this.getLastOpponentMove();
            if (lastMove) {
                const lastCol = lastMove.to[1];
                const lastWing = lastCol < 4 ? 'Q' : 'K';
                const pieceMoves = this.getValidMoves(row, col);
                const hasCorrectWing = pieceMoves.some(([r, nc]) => (nc < 4) === (lastWing === 'Q'));
                if (!hasCorrectWing) return false;
            }
        }

        // Copycat Master
        if (c.id === 'copycat_master' && this.moveCount > 0) {
            const lastMove = this.getLastOpponentMove();
            if (lastMove) {
                const lastCol = lastMove.to[1];
                const pieceMoves = this.getValidMoves(row, col);
                const onCol = col === lastCol;
                const canPlayOnCol = pieceMoves.some(([r, nc]) => nc === lastCol);
                if (!onCol && !canPlayOnCol) return false;
            }
        }

        // Obsédé échecs : si on peut faire échec, on doit
        if (c.id === 'obsede_echecs') {
            const checkMoves = allMoves.filter(m => this.moveGivesCheck(m.from, m.to));
            if (checkMoves.length > 0) {
                const pieceMoves = this.getValidMoves(row, col);
                const givesCheck = pieceMoves.some(([nr, nc]) => this.moveGivesCheck([row, col], [nr, nc]));
                if (!givesCheck) return false;
            }
        }

        // Rechargement : après capture, obligation de recul
        if (c.id === 'rechargement' && this.mustMoveBackward[piece.color]) {
            const pieceMoves = this.getValidMoves(row, col);
            const hasBackward = pieceMoves.some(([nr]) => piece.color === 'white' ? nr > row : nr < row);
            if (!hasBackward) return false;
        }

        // Commandant de bord : ne peut capturer que si roi a bougé
        if (c.id === 'commandant_bord') {
            const pieceMoves = this.getValidMoves(row, col);
            const hasCapture = pieceMoves.some(([r, c]) => this.board[r][c]);
            if (hasCapture && this.kingMovedLastTurns[piece.color] === 0) return false;
        }

        // Adepte captures
        if (c.id === 'adepte_captures' && this.mustContinueCapture[piece.color]) {
            const pieceMoves = this.getValidMoves(row, col);
            if (!pieceMoves.some(([r, c]) => this.board[r][c])) return false;
        }

        // Yeux gros : si on peut capturer plus fort, on doit
        if (c.id === 'yeux_gros') {
            const captures = allMoves.filter(m => this.board[m.to[0]][m.to[1]]);
            if (captures.length > 0) {
                const maxVal = Math.max(...captures.map(m => PIECE_VALUES[this.board[m.to[0]][m.to[1]].type]));
                const pieceCaptures = this.getValidMoves(row, col).filter(([r, c]) => this.board[r][c]);
                if (pieceCaptures.length > 0) {
                    const myMax = Math.max(...pieceCaptures.map(([r, c]) => PIECE_VALUES[this.board[r][c].type]));
                    if (myMax < maxVal) return false;
                }
            }
        }

        // Cible en vue
        if (c.id === 'cible_vue' && this.targetSquare) {
            const pieceMoves = this.getValidMoves(row, col);
            const canReach = pieceMoves.some(([r, c]) => r === this.targetSquare[0] && c === this.targetSquare[1]);
            if (!canReach) return false;
        }

        return true;
    }

    moveGivesCheck(from, to) {
        const piece = this.board[from[0]][from[1]];
        if (!piece) return false;
        const oppColor = piece.color === 'white' ? 'black' : 'white';
        const orig = this.board[to[0]][to[1]];
        this.board[to[0]][to[1]] = piece;
        this.board[from[0]][from[1]] = null;
        const check = this.isKingInCheck(oppColor);
        this.board[from[0]][from[1]] = piece;
        this.board[to[0]][to[1]] = orig;
        return check;
    }

    getLastOpponentMove() {
        return this._lastOpponentMove || null;
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;
        if (this.onlineMode && this.currentPlayer !== this.myRole) return;

        const piece = this.board[row][col];
        const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        // Si une case est déjà sélectionnée
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            const selectedPiece = this.board[selectedRow][selectedCol];

            // Si on clique sur la même case, désélectionner
            if (selectedRow === row && selectedCol === col) {
                this.clearSelection();
                return;
            }

            // Si on clique sur une pièce de la même couleur, changer la sélection
            if (piece && piece.color === this.currentPlayer) {
                this.clearSelection();
                this.selectSquare(row, col);
                return;
            }

            // Essayer de déplacer la pièce
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
            }
        } else {
            // Sélectionner une pièce si c'est au tour du joueur et autorisée par le défi
            if (piece && piece.color === this.currentPlayer && this.canSelectPiece(row, col)) {
                this.selectSquare(row, col);
            }
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = [row, col];
        const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        squareElement.classList.add('selected');

        // Afficher les mouvements possibles
        this.showPossibleMoves(row, col);
    }

    clearSelection() {
        if (this.selectedSquare) {
            const [row, col] = this.selectedSquare;
            const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            squareElement.classList.remove('selected');
        }
        this.hidePossibleMoves();
        this.selectedSquare = null;
    }

    showPossibleMoves(row, col) {
        const moves = this.getValidMoves(row, col);
        moves.forEach(([moveRow, moveCol]) => {
            const squareElement = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
            if (this.board[moveRow][moveCol]) {
                squareElement.classList.add('possible-capture');
            } else {
                squareElement.classList.add('possible-move');
            }
        });
    }

    hidePossibleMoves() {
        document.querySelectorAll('.possible-move, .possible-capture').forEach(el => {
            el.classList.remove('possible-move', 'possible-capture');
        });
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let allMoves = this.getPieceMoves(row, col, piece);

        // Filtrer les mouvements qui mettent le roi en échec
        let moves = [];
        for (const [newRow, newCol] of allMoves) {
            if (this.isMoveSafe(row, col, newRow, newCol)) {
                moves.push([newRow, newCol]);
            }
        }

        // Appliquer les règles des défis (filtrage)
        moves = this.filterMovesByChallenge(moves, row, col, piece);

        return moves;
    }

    filterMovesByChallenge(moves, fromRow, fromCol, piece) {
        const c = piece.color === 'white' ? this.matchState.whiteChallenge : this.matchState.blackChallenge;
        if (!c) return moves;

        const halfMove = this.moveCount;

        // À mon tour ! : ne jouer qu'avec le type de pièce imposé (pion, cavalier, fou, tour, dame, roi)
        if (c.id === 'mon_tour') {
            const required = this.pieceTypeOrder[this.pieceTypeIndex[piece.color]];
            if (piece.type !== required) return [];
        }

        // Drôle de reine : la dame ne peut pas capturer
        if (c.id === 'drole_reine' && piece.type === 'queen') {
            moves = moves.filter(([r, mc]) => !this.board[r][mc]); // pas de capture pour la dame
        }

        // Manger, manger, manger : si un pion peut capturer, il ne peut que capturer
        if (c.id === 'manger_manger' && piece.type === 'pawn') {
            const hasCapture = moves.some(([r, mc]) => this.board[r][mc]);
            if (hasCapture) moves = moves.filter(([r, mc]) => this.board[r][mc]);
        }

        // Yeux plus gros que le ventre : ne pas capturer une pièce de moindre valeur si on peut en prendre une plus forte
        if (c.id === 'yeux_gros') {
            const captures = moves.filter(([r, mc]) => this.board[r][mc]);
            if (captures.length > 0) {
                const maxVal = Math.max(...captures.map(([r, mc]) => PIECE_VALUES[this.board[r][mc]?.type] ?? 0));
                const bestCaptures = captures.filter(([r, mc]) => (PIECE_VALUES[this.board[r][mc]?.type] ?? 0) === maxVal);
                const nonCaptures = moves.filter(([r, mc]) => !this.board[r][mc]);
                moves = [...bestCaptures, ...nonCaptures];
            }
        }

        // Obsédé par les échecs : si on peut faire échec, on ne peut que faire échec
        if (c.id === 'obsede_echecs') {
            const checkMoves = moves.filter(([nr, nc]) => this.moveGivesCheck([fromRow, fromCol], [nr, nc]));
            if (checkMoves.length > 0) moves = checkMoves;
        }

        // Seulement 4 pions
        if (c.id === '4_pions' && piece.type === 'pawn') {
            const activatedCount = this.activatedPawnIds[piece.color].size;
            const thisPawnActivated = piece._pawnId !== undefined;
            if (!thisPawnActivated && activatedCount >= 4) return [];
        }

        // Roi vaillant (à partir coup 10) : roi sur 2e/7e rangée, ne peut pas revenir
        // Blanc: 2e rang = row 6, doit être sur row 0-6 (pas 7). Noir: 7e rang = row 1, doit être sur row 1-7 (pas 0)
        if (c.id === 'roi_vaillant' && piece.type === 'king' && halfMove >= 10) {
            const validRows = piece.color === 'white' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
            moves = moves.filter(([r]) => validRows.includes(r));
        }

        // Fous flemmards : pas au-delà de la 4e rangée
        if (c.id === 'fous_flemmards' && piece.type === 'bishop') {
            const maxRow = piece.color === 'white' ? 4 : 3;
            const minRow = piece.color === 'white' ? 0 : 4;
            moves = moves.filter(([r]) => piece.color === 'white' ? r >= 4 : r <= 3);
        }

        // Activation tour : pas de mouvement avant coup 15 (inclut le roque)
        if (c.id === 'activation_tour' && halfMove < 15) {
            if (piece.type === 'rook') return [];
            if (piece.type === 'king') moves = moves.filter(([r, mc]) => mc !== 2 && mc !== 6);
        }

        // Limitation de vitesse : max 3 cases (Chebyshev)
        if (c.id === 'limitation_vitesse') {
            moves = moves.filter(([r, c]) => Math.max(Math.abs(r - fromRow), Math.abs(c - fromCol)) <= 3);
        }

        // Case g4 (row 4, col 6)
        if (c.id === 'case_g4') {
            moves = moves.filter(([r, c]) => !(r === 4 && c === 6));
        }

        // Mauvais souvenir : colonne c (col 2)
        if (c.id === 'mauvais_souvenir') {
            moves = moves.filter(([r, mc]) => mc !== 2);
        }

        // Commandant de bord : capturer uniquement si le roi a bougé dans les 3 derniers coups
        if (c.id === 'commandant_bord' && this.kingMovedLastTurns[piece.color] === 0) {
            moves = moves.filter(([r, mc]) => !this.board[r][mc]);
        }

        // Chef des armées
        if (c.id === 'chef_armees') {
            const furthestPawnRow = this.getFurthestPawnRow(piece.color);
            if (furthestPawnRow !== null) {
                if (piece.color === 'white') moves = moves.filter(([r]) => r >= furthestPawnRow);
                else moves = moves.filter(([r]) => r <= furthestPawnRow);
            }
        }

        // Rapidement épuisé
        if (c.id === 'rapidement_epuise') {
            const key = `${fromRow}-${fromCol}`;
            const count = this.pieceMoveCount[key] || 0;
            if (count >= 3) return [];
        }

        // Lave montante
        if (c.id === 'lave_montante' && this.lavaRow !== null) {
            if (fromRow === this.lavaRow) return [];
            moves = moves.filter(([r]) => r !== this.lavaRow);
        }

        // Refus de participation
        if (c.id === 'refus_participation') {
            const frozen = this.frozenPieceTypes[piece.color];
            if (frozen[piece.type] > 0) return [];
        }

        // Rechargement : coup de recul obligatoire
        if (c.id === 'rechargement' && this.mustMoveBackward[piece.color]) {
            moves = moves.filter(([r]) => piece.color === 'white' ? r > fromRow : r < fromRow);
        }

        // Adepte des captures : après une capture, ne faire que des captures
        if (c.id === 'adepte_captures' && this.mustContinueCapture[piece.color]) {
            moves = moves.filter(([r, mc]) => this.board[r][mc]);
        }

        // Alternance : la case d'arrivée doit être de couleur opposée à la case d'arrivée du coup précédent
        if (c.id === 'alternance') {
            const lastColor = this.lastLandingSquareColor?.[piece.color] ?? null;
            if (lastColor !== null) {
                moves = moves.filter(([r, destCol]) => (r + destCol) % 2 !== lastColor);
            }
        }

        // Copycat : jouer sur la même aile que le dernier coup adverse (cols 0-3 = dame, 4-7 = roi)
        if (c.id === 'copycat' && this.moveCount > 0 && this._lastOpponentMove) {
            const lastCol = this._lastOpponentMove.to[1];
            const opponentWingQueenside = lastCol < 4;
            moves = moves.filter(([r, destCol]) => (destCol < 4) === opponentWingQueenside);
        }

        // Copycat Master : jouer sur la même colonne que le dernier coup adverse, ou déplacer une pièce qui est sur cette colonne
        if (c.id === 'copycat_master' && this.moveCount > 0 && this._lastOpponentMove) {
            const lastCol = this._lastOpponentMove.to[1];
            moves = moves.filter(([r, destCol]) => fromCol === lastCol || destCol === lastCol);
        }

        return moves;
    }

    getFurthestPawnRow(color) {
        let furthest = color === 'white' ? 7 : 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const p = this.board[r][c];
                if (p && p.type === 'pawn' && p.color === color) {
                    if (color === 'white' && r < furthest) furthest = r;
                    if (color === 'black' && r > furthest) furthest = r;
                }
            }
        }
        return (color === 'white' && furthest === 7) || (color === 'black' && furthest === 0) ? null : furthest;
    }

    getPieceMoves(row, col, piece) {
        const moves = [];

        switch (piece.type) {
            case 'pawn':
                return this.getPawnMoves(row, col, piece);
            case 'rook':
                return this.getRookMoves(row, col, piece);
            case 'knight':
                return this.getKnightMoves(row, col, piece);
            case 'bishop':
                return this.getBishopMoves(row, col, piece);
            case 'queen':
                return this.getQueenMoves(row, col, piece);
            case 'king':
                return this.getKingMoves(row, col, piece);
            default:
                return moves;
        }
    }

    getPawnMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Avancer d'une case
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }

        // Capturer en diagonale
        for (const colOffset of [-1, 1]) {
            const newCol = col + colOffset;
            if (this.isInBounds(row + direction, newCol)) {
                const targetPiece = this.board[row + direction][newCol];
                if (targetPiece && targetPiece.color !== piece.color) {
                    moves.push([row + direction, newCol]);
                }
                // Prise en passant : case vide, pion adverse à côté vient de faire 2 cases
                else if (!targetPiece && this.enPassantTarget) {
                    const [epRow, epCol] = this.enPassantTarget;
                    const enemyPawn = this.board[row][newCol];
                    if (row + direction === epRow && newCol === epCol && enemyPawn?.type === 'pawn' && enemyPawn?.color !== piece.color) {
                        moves.push([row + direction, newCol]);
                    }
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col, piece) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < BOARD_SIZE; i++) {
                const newRow = row + dRow * i;
                const newCol = col + dCol * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getKnightMoves(row, col, piece) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dRow, dCol] of knightMoves) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getBishopMoves(row, col, piece) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < BOARD_SIZE; i++) {
                const newRow = row + dRow * i;
                const newCol = col + dCol * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (targetPiece.color !== piece.color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getQueenMoves(row, col, piece) {
        return [...this.getRookMoves(row, col, piece), ...this.getBishopMoves(row, col, piece)];
    }

    getKingMoves(row, col, piece) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        // Roque
        const rights = this.castlingRights[piece.color];
        const backRow = piece.color === 'white' ? 7 : 0;
        if (row !== backRow || col !== 4) return moves;

        if (rights.k) {
            if (!this.board[backRow][5] && !this.board[backRow][6] && this.board[backRow][7]?.type === 'rook' && this.board[backRow][7]?.color === piece.color) {
                if (!this.isSquareAttacked(backRow, 4, piece.color) && !this.isSquareAttacked(backRow, 5, piece.color) && !this.isSquareAttacked(backRow, 6, piece.color)) {
                    moves.push([backRow, 6]);
                }
            }
        }
        if (rights.q) {
            if (!this.board[backRow][1] && !this.board[backRow][2] && !this.board[backRow][3] && this.board[backRow][0]?.type === 'rook' && this.board[backRow][0]?.color === piece.color) {
                if (!this.isSquareAttacked(backRow, 4, piece.color) && !this.isSquareAttacked(backRow, 3, piece.color) && !this.isSquareAttacked(backRow, 2, piece.color)) {
                    moves.push([backRow, 2]);
                }
            }
        }

        return moves;
    }

    isSquareAttacked(row, col, byColor) {
        const oppColor = byColor === 'white' ? 'black' : 'white';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const p = this.board[r][c];
                if (p && p.color === oppColor) {
                    const pieceMoves = this.getPieceMoves(r, c, p);
                    if (pieceMoves.some(([mr, mc]) => mr === row && mc === col)) return true;
                }
            }
        }
        return false;
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) return false;

        const moves = this.getValidMoves(fromRow, fromCol);
        return moves.some(([row, col]) => row === toRow && col === toCol);
    }

    isMoveSafe(fromRow, fromCol, toRow, toCol) {
        const movingPiece = this.board[fromRow][fromCol];
        const originalPiece = this.board[toRow][toCol];
        let enPassantPawn = null;
        let rookFrom = null, rookTo = null;

        if (movingPiece?.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            rookFrom = [fromRow, toCol === 6 ? 7 : 0];
            rookTo = [fromRow, toCol === 6 ? 5 : 3];
            this.board[rookTo[0]][rookTo[1]] = this.board[rookFrom[0]][rookFrom[1]];
            this.board[rookFrom[0]][rookFrom[1]] = null;
        }
        if (movingPiece?.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !originalPiece && this.enPassantTarget) {
            const [epRow, epCol] = this.enPassantTarget;
            if (toRow === epRow && toCol === epCol) {
                enPassantPawn = this.board[fromRow][toCol];
                this.board[fromRow][toCol] = null;
            }
        }

        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;

        const isSafe = !this.isKingInCheck(this.currentPlayer);

        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;
        if (enPassantPawn) this.board[fromRow][toCol] = enPassantPawn;
        if (rookFrom) {
            this.board[rookFrom[0]][rookFrom[1]] = this.board[rookTo[0]][rookTo[1]];
            this.board[rookTo[0]][rookTo[1]] = null;
        }

        return isSafe;
    }

    isKingInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;

        const [kingRow, kingCol] = kingPos;
        const opponentColor = color === 'white' ? 'black' : 'white';

        // Vérifier si une pièce adverse peut capturer le roi
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    const moves = this.getPieceMoves(row, col, piece);
                    if (moves.some(([moveRow, moveCol]) => moveRow === kingRow && moveCol === kingCol)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    findKing(color) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    isCheckmate(color) {
        if (!this.isKingInCheck(color)) return false;

        // Vérifier si le roi peut bouger
        const kingPos = this.findKing(color);
        if (kingPos) {
            const [kingRow, kingCol] = kingPos;
            const kingMoves = this.getValidMoves(kingRow, kingCol);
            if (kingMoves.length > 0) return false;
        }

        // Vérifier si une autre pièce peut bloquer l'échec
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }

        return true;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        let captured = this.board[toRow][toCol];
        const color = piece.color;

        this.enPassantTarget = null;

        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            const rookCol = toCol === 6 ? 7 : 0;
            const rookNewCol = toCol === 6 ? 5 : 3;
            this.board[fromRow][rookNewCol] = this.board[fromRow][rookCol];
            this.board[fromRow][rookCol] = null;
        }
        if (piece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !captured) {
            captured = this.board[fromRow][toCol] || null;
            if (captured) this.board[fromRow][toCol] = null;
        }

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        if (piece.type === 'pawn' && Math.abs(fromRow - toRow) === 2) {
            this.enPassantTarget = [color === 'white' ? toRow + 1 : toRow - 1, toCol];
        }
        if (piece.type === 'king') this.castlingRights[color] = { k: false, q: false };
        if (piece.type === 'rook') {
            if (fromCol === 0) this.castlingRights[color].q = false;
            if (fromCol === 7) this.castlingRights[color].k = false;
        }

        const isPromotion = piece.type === 'pawn' && ((piece.color === 'white' && toRow === 0) || (piece.color === 'black' && toRow === 7));
        if (isPromotion) {
            this._promotionContext = { toRow, toCol, color: piece.color, fromRow, fromCol, piece, captured };
            document.getElementById('promotion-modal').style.display = 'flex';
            return;
        }

        this.continueMakeMove(fromRow, fromCol, toRow, toCol, piece, captured, color);
    }

    completePromotion(pieceType) {
        const ctx = this._promotionContext;
        if (!ctx) return;
        document.getElementById('promotion-modal').style.display = 'none';
        this._promotionContext = null;

        const pawn = this.board[ctx.toRow][ctx.toCol];
        if (pawn?._pawnId === undefined && pawn?.type === 'pawn') {
            pawn._pawnId = `${ctx.fromRow}-${ctx.fromCol}`;
            this.activatedPawnIds[ctx.color].add(pawn._pawnId);
        }

        const symbols = {
            queen: [PIECES.WHITE_QUEEN, PIECES.BLACK_QUEEN],
            rook: [PIECES.WHITE_ROOK, PIECES.BLACK_ROOK],
            bishop: [PIECES.WHITE_BISHOP, PIECES.BLACK_BISHOP],
            knight: [PIECES.WHITE_KNIGHT, PIECES.BLACK_KNIGHT]
        };
        const sym = ctx.color === 'white' ? symbols[pieceType][0] : symbols[pieceType][1];
        this.board[ctx.toRow][ctx.toCol] = { type: pieceType, color: ctx.color, symbol: sym };
        this.continueMakeMove(ctx.fromRow, ctx.fromCol, ctx.toRow, ctx.toCol, this.board[ctx.toRow][ctx.toCol], ctx.captured, ctx.color);
    }

    continueMakeMove(fromRow, fromCol, toRow, toCol, piece, captured, color) {
        const oppColor = color === 'white' ? 'black' : 'white';

        // --- Mise à jour état des défis ---
        this.moveCount++;
        this._lastOpponentMove = { from: [fromRow, fromCol], to: [toRow, toCol], piece };

        if (piece.type === 'pawn') {
            if (piece._pawnId === undefined) {
                piece._pawnId = `${fromRow}-${fromCol}`;
                this.activatedPawnIds[color].add(piece._pawnId);
            }
        }
        this.lastPieceType[color] = piece.type;

        if (piece.type === 'king') this.kingMovedLastTurns[color] = 3;
        else this.kingMovedLastTurns[color] = Math.max(0, (this.kingMovedLastTurns[color] || 0) - 1);

        const pkey = `${fromRow}-${fromCol}`;
        this.pieceMoveCount[pkey] = (this.pieceMoveCount[pkey] || 0) + 1;

        if (captured) {
            this.mustMoveBackward[color] = true;
            const chall = this.matchState[color === 'white' ? 'whiteChallenge' : 'blackChallenge'];
            if (chall?.id === 'adepte_captures') this.mustContinueCapture[color] = true;
            if (captured.type === 'rook') {
                this._capturedRookBy[color] = true;
                const capColor = oppColor;
                if (toRow === (capColor === 'white' ? 7 : 0)) {
                    if (toCol === 0) this.castlingRights[capColor].q = false;
                    if (toCol === 7) this.castlingRights[capColor].k = false;
                }
            }
            if (this.matchState.blackChallenge?.id === 'refus_participation' && color === 'white') {
                this.frozenPieceTypes.black[captured.type] = 4;
            }
            if (this.matchState.whiteChallenge?.id === 'refus_participation' && color === 'black') {
                this.frozenPieceTypes.white[captured.type] = 4;
            }
        } else {
            this.mustMoveBackward[color] = false;
            this.mustContinueCapture[color] = false;
        }

        if (color === 'white' && this.matchState.whiteChallenge?.id === 'mon_tour') {
            this.pieceTypeIndex.white = (this.pieceTypeIndex.white + 1) % 6;
        }
        if (color === 'black' && this.matchState.blackChallenge?.id === 'mon_tour') {
            this.pieceTypeIndex.black = (this.pieceTypeIndex.black + 1) % 6;
        }

        for (const c of ['white', 'black']) {
            for (const t of Object.keys(this.frozenPieceTypes[c])) {
                if (this.frozenPieceTypes[c][t] > 0) this.frozenPieceTypes[c][t]--;
            }
        }

        if (toRow === 0 && (toCol === 3 || toCol === 4)) this.touchedTargetSquares.white[toCol === 3 ? 'd8' : 'e8'] = true;
        if (toRow === 7 && (toCol === 3 || toCol === 4)) this.touchedTargetSquares.black[toCol === 3 ? 'd1' : 'e1'] = true;

        const halfMove = this.moveCount;
        if (this.matchState.whiteChallenge?.id === 'lave_montante' || this.matchState.blackChallenge?.id === 'lave_montante') {
            // Tous les 10 tours complets (20 demi-coups) : la lave monte d'une rangée
            if (halfMove % 20 === 0 && halfMove > 0) {
                this.lavaRow = this.lavaRow === null ? 7 : this.lavaRow - 1;
            }
        }
        this.lastLandingSquareColor[color] = (toRow + toCol) % 2;

        if (this.matchState.whiteChallenge?.id === 'cible_vue' || this.matchState.blackChallenge?.id === 'cible_vue') {
            if (halfMove % 7 === 0 && halfMove > 7 && this.targetSquare) {
                const challenger = this.matchState.whiteChallenge?.id === 'cible_vue' ? 'white' : 'black';
                const reached = this.board[this.targetSquare[0]][this.targetSquare[1]]?.color === challenger;
                if (!reached) {
                    this.gameOver = true;
                    const winner = challenger === 'white' ? 'Noir' : 'Blanc';
                    this._lastWinner = winner;
                    this._lastVictoryReason = 'La cible du défi n\'a pas été atteinte à temps.';
                    document.getElementById('game-status').textContent = `Cible non atteinte! ${winner} gagne!`;
                    this.emitStateIfOnline();
                    this.renderBoard();
                    this.showVictoryScreen(winner);
                    return;
                }
            }
            if (halfMove % 7 === 0 && halfMove > 0) {
                this.targetSquare = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
            }
        }

        this.currentPlayer = oppColor;

        // --- Conditions de défaite par défi ---
        const loser = this.checkChallengeLosses();
        if (loser) {
            this.gameOver = true;
            const winner = loser === 'white' ? 'Noir' : 'Blanc';
            this._lastWinner = winner;
            this._lastVictoryReason = `Défi non respecté par ${loser === 'white' ? 'Blanc' : 'Noir'}.`;
            document.getElementById('game-status').textContent = `${winner} gagne! (défi non respecté par ${loser === 'white' ? 'Blanc' : 'Noir'})`;
            this.emitStateIfOnline();
            this.renderBoard();
            this.showVictoryScreen(winner);
            return;
        }


        // --- Vérifier stressé tours au coup 18 ---
        if (halfMove >= 18) {
            const wc = this.matchState.whiteChallenge;
            const bc = this.matchState.blackChallenge;
            if (wc?.id === 'stresse_tours' && !this._capturedRookBy.white) {
                this.gameOver = true;
                this._lastWinner = 'Noir';
                this._lastVictoryReason = 'Blanc n\'a pas capturé de tour (défi « Stressé des tours »).';
                document.getElementById('game-status').textContent = 'Blanc n\'a pas capturé de tour! Noir gagne!';
                this.emitStateIfOnline();
                this.showVictoryScreen('black');
                return;
            }
            if (bc?.id === 'stresse_tours' && !this._capturedRookBy.black) {
                this.gameOver = true;
                this._lastWinner = 'Blanc';
                this._lastVictoryReason = 'Noir n\'a pas capturé de tour (défi « Stressé des tours »).';
                document.getElementById('game-status').textContent = 'Noir n\'a pas capturé de tour! Blanc gagne!';
                this.emitStateIfOnline();
                this.showVictoryScreen('white');
                return;
            }
        }

        // --- Vérifier détermination avant coup 20 ---
        if (halfMove >= 20) {
            const wc = this.matchState.whiteChallenge;
            const bc = this.matchState.blackChallenge;
            if (wc?.id === 'determination' && (!this.touchedTargetSquares.white.d8 || !this.touchedTargetSquares.white.e8)) {
                this.gameOver = true;
                this._lastWinner = 'Noir';
                this._lastVictoryReason = 'Blanc n\'a pas atteint les cases d8 et e8 (défi « Détermination »).';
                document.getElementById('game-status').textContent = 'Blanc n\'a pas atteint d8 et e8! Noir gagne!';
                this.emitStateIfOnline();
                this.showVictoryScreen('black');
                return;
            }
            if (bc?.id === 'determination' && (!this.touchedTargetSquares.black.d1 || !this.touchedTargetSquares.black.e1)) {
                this.gameOver = true;
                this._lastWinner = 'Blanc';
                this._lastVictoryReason = 'Noir n\'a pas atteint les cases d1 et e1 (défi « Détermination »).';
                document.getElementById('game-status').textContent = 'Noir n\'a pas atteint d1 et e1! Blanc gagne!';
                this.emitStateIfOnline();
                this.showVictoryScreen('white');
                return;
            }
        }

        // --- Pat / match nul (Oops = défaite) ---
        const hasLegalMoves = this.getAllValidMovesForPlayer(this.currentPlayer).length > 0;
        const inCheck = this.isKingInCheck(this.currentPlayer);
        if (!inCheck && !hasLegalMoves) {
            const stalemated = this.currentPlayer;
            const oopsPlayer = this.matchState.whiteChallenge?.id === 'oops' ? 'white' : (this.matchState.blackChallenge?.id === 'oops' ? 'black' : null);
            if (oopsPlayer === stalemated) {
                this.gameOver = true;
                const winner = stalemated === 'white' ? 'Noir' : 'Blanc';
                this._lastWinner = winner;
                this._lastVictoryReason = 'Pat. Le joueur avec le défi « Oops » a fait pat (= défaite).';
                document.getElementById('game-status').textContent = `Pat ! Oops = défaite. ${winner} gagne!`;
                this.emitStateIfOnline();
                this.showVictoryScreen(winner);
                return;
            }
        }

        // --- Échec et mat (avec règle Oops) ---
        const isCheckmate = this.isCheckmate(this.currentPlayer);
        const mattingColor = oppColor;
        const wc = this.matchState.whiteChallenge;
        const bc = this.matchState.blackChallenge;

        if (isCheckmate) {
            const oopsPlayer = wc?.id === 'oops' ? 'white' : (bc?.id === 'oops' ? 'black' : null);
            if (oopsPlayer && oopsPlayer === mattingColor) {
                if (halfMove < 30 || halfMove > 40) {
                    this.gameOver = true;
                    const winner = mattingColor === 'white' ? 'Noir' : 'Blanc';
                    this._lastWinner = winner;
                    this._lastVictoryReason = 'Échec et mat hors de la fenêtre des coups 30 à 40 (défi « Oops »).';
                    document.getElementById('game-status').textContent = `Mat hors fenêtre 30-40! ${winner} gagne!`;
                    this.emitStateIfOnline();
                    this.showVictoryScreen(winner);
                    return;
                }
            }
            this.gameOver = true;
            const winner = this.currentPlayer === 'white' ? 'Noir' : 'Blanc';
            this._lastWinner = winner;
            this._lastVictoryReason = 'Échec et mat.';
            document.getElementById('game-status').textContent = `Échec et Mat! ${winner} gagne!`;
            this.emitStateIfOnline();
            this.showVictoryScreen(winner);
        } else if (this.isKingInCheck(this.currentPlayer)) {
            document.getElementById('game-status').textContent = 'Échec!';
        } else {
            document.getElementById('game-status').textContent = '';
        }

        this.emitStateIfOnline();
        this.renderBoard();
    }

    checkChallengeLosses() {
        for (const color of ['white', 'black']) {
            const c = color === 'white' ? this.matchState.whiteChallenge : this.matchState.blackChallenge;
            if (!c) continue;

            if (c.id === 'colonne_b') {
                let hasOnB = false;
                for (let r = 0; r < BOARD_SIZE; r++) {
                    if (this.board[r][1]?.color === color) { hasOnB = true; break; }
                }
                if (!hasOnB) return color;
            }

            // Roi vaillant : à partir du coup 10, le roi doit être sur la 2e/7e rangée (et au-delà)
            if (c.id === 'roi_vaillant' && this.moveCount >= 10) {
                const kingPos = this.findKing(color);
                if (kingPos) {
                    const kingRow = kingPos[0];
                    const validRows = color === 'white' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
                    if (!validRows.includes(kingRow)) return color;
                }
            }

            // Case g4 : attaquer la case g4 = défaite (g4 = row 4, col 6)
            if (c.id === 'case_g4') {
                const g4Row = 4, g4Col = 6;
                for (let rr = 0; rr < BOARD_SIZE; rr++) {
                    for (let cc = 0; cc < BOARD_SIZE; cc++) {
                        const p = this.board[rr][cc];
                        if (p && p.color === color) {
                            const pieceMoves = this.getPieceMoves(rr, cc, p);
                            if (pieceMoves.some(([mr, mc]) => mr === g4Row && mc === g4Col)) return color;
                        }
                    }
                }
            }

            if (c.id === 'impasse_mexicaine') {
                const rooks = [];
                for (let r = 0; r < BOARD_SIZE; r++) {
                    for (let col = 0; col < BOARD_SIZE; col++) {
                        if (this.board[r][col]?.type === 'rook' && this.board[r][col]?.color === color) rooks.push([r, col]);
                    }
                }
                if (rooks.length >= 2) {
                    const [r1, c1] = rooks[0], [r2, c2] = rooks[1];
                    if (r1 === r2) {
                        let clear = true;
                        for (let k = Math.min(c1, c2) + 1; k < Math.max(c1, c2); k++) if (this.board[r1][k]) { clear = false; break; }
                        if (clear) return color;
                    }
                    if (c1 === c2) {
                        let clear = true;
                        for (let k = Math.min(r1, r2) + 1; k < Math.max(r1, r2); k++) if (this.board[k][c1]) { clear = false; break; }
                        if (clear) return color;
                    }
                }
            }

            if (c.id === 'loyaute') {
                const kp = this.findKing(color);
                if (kp) {
                    let adj = 0;
                    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                        const nr = kp[0] + dr, nc = kp[1] + dc;
                        if (this.isInBounds(nr, nc) && this.board[nr][nc]?.color === color) adj++;
                    }
                    if (adj < 3) return color;
                }
            }

            // Rechargement : après capture, obligation de recul au prochain coup. Si impossible = défaite
            // Vérifier au début du tour du joueur concerné
            if (c.id === 'rechargement' && this.currentPlayer === color && this.mustMoveBackward[color]) {
                const hasBackwardMove = this.getAllValidMovesForPlayer(color).length > 0;
                if (!hasBackwardMove) return color;
            }
        }
        return null;
    }

    showVictoryScreen(winner) {
        const displayWinner = (winner === 'white' || winner === 'Blanc') ? 'Blanc' : 'Noir';
        this._lastWinner = displayWinner;
        const isWhite = displayWinner === 'Blanc';
        const challenge = isWhite ? this.matchState.whiteChallenge : this.matchState.blackChallenge;
        const wonWithImpossible = challenge?.difficulty === 'impossible';
        document.getElementById('victory-title').textContent = wonWithImpossible ? '🏆 VICTOIRE DU MATCH ! 🏆' : 'Partie terminée';
        document.getElementById('victory-message').textContent = `${displayWinner} gagne!` + (wonWithImpossible ? ' Avec un défi IMPOSSIBLE ! ' : '');
        const reasonEl = document.getElementById('victory-reason');
        if (this._lastVictoryReason) {
            reasonEl.textContent = this._lastVictoryReason;
            reasonEl.style.display = '';
        } else {
            reasonEl.textContent = '';
            reasonEl.style.display = 'none';
        }
        document.getElementById('match-status').textContent = wonWithImpossible ? 'Match gagné !' : 'Prochaine partie : le vainqueur monte en difficulté.';
        this.showScreen('victory');
    }

    nextGame() {
        if (this.onlineMode) {
            this.onlineMode = false;
            this.myRole = null;
            this.showScreen('mode');
            return;
        }
        const lastWinner = (this._lastWinner || '').includes('Blanc') ? 'white' : 'black';
        const nextIdx = DIFFICULTY_ORDER.indexOf(lastWinner === 'white' ? this.matchState.whiteDifficulty : this.matchState.blackDifficulty) + 1;
        if (nextIdx < DIFFICULTY_ORDER.length) {
            const next = DIFFICULTY_ORDER[nextIdx];
            if (lastWinner === 'white') document.getElementById('white-difficulty').value = next;
            else document.getElementById('black-difficulty').value = next;
        }
        this.showScreen('setup');
    }

    isInBounds(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    updateUI() {
        let playerText = this.currentPlayer === 'white' ? 'Blanc' : 'Noir';
        if (this.onlineMode && this.myRole) {
            const isMyTurn = this.currentPlayer === this.myRole;
            playerText += isMyTurn ? ' (à vous)' : ' (adversaire)';
        }
        document.getElementById('current-player').textContent = playerText;

        // Mettre en évidence le roi en échec
        if (this.isKingInCheck(this.currentPlayer)) {
            const kingPos = this.findKing(this.currentPlayer);
            if (kingPos) {
                const [row, col] = kingPos;
                const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                squareElement.classList.add('in-check');
            }
        }
    }

    reset() {
        this.showScreen('setup');
    }
}

// Initialiser le jeu au chargement de la page
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new ChessGame();
});

