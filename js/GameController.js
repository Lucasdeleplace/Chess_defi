import { Board, PIECES } from './core/Board.js';
import { getValidMoves, isKingInCheck, getAllValidMoves } from './core/MoveValidator.js';
import { ChallengeEngine } from './challenges/ChallengeEngine.js';
import { assignChallenges, DIFFICULTY_ORDER } from './challenges/ChallengeRegistry.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { ScreenManager } from './ui/ScreenManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { saveGameState, loadGameState, clearGameState, hasSavedGame } from './storage/GamePersistence.js';

export class GameController {
    constructor() {
        this.board = new Board();
        this.challengeEngine = new ChallengeEngine();
        this.renderer = new BoardRenderer('chessboard');
        this.screenManager = new ScreenManager();
        this.network = new NetworkManager();

        this.currentPlayer = 'white';
        this.gameOver = false;
        this.matchState = { whiteDifficulty: 'facile', blackDifficulty: 'facile', whiteChallenge: null, blackChallenge: null };
        this.enPassantTarget = null;
        this.castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };

        this.onlineMode = false;
        this.myRole = null;

        this._lastWinner = null;
        this._lastVictoryReason = null;
        this._promotionContext = null;

        this.bindEvents();
        this.tryRestoreGame();
    }

    bindEvents() {
        document.getElementById('start-match-btn').addEventListener('click', () => this.startLocalMatch());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        document.getElementById('next-game-btn').addEventListener('click', () => this.nextGame());
        document.getElementById('mode-local-btn').addEventListener('click', () => this.screenManager.show('setup'));
        document.getElementById('mode-online-btn').addEventListener('click', () => this.showOnlineLobby());
        document.getElementById('back-to-mode-btn').addEventListener('click', () => this.screenManager.show('mode'));
        document.getElementById('create-game-btn').addEventListener('click', () => this.createOnlineGame());
        document.getElementById('join-game-btn').addEventListener('click', () => this.joinOnlineGame());
        document.querySelectorAll('.promo-btn').forEach(btn => {
            btn.addEventListener('click', () => this.completePromotion(btn.dataset.piece));
        });

        this.setupNetworkCallbacks();
    }

    tryRestoreGame() {
        if (!hasSavedGame()) {
            this.screenManager.show('mode');
            return;
        }

        const saved = loadGameState();
        if (!saved || saved.onlineMode) {
            clearGameState();
            this.screenManager.show('mode');
            return;
        }

        this.board = Board.fromJSON(saved.board);
        this.currentPlayer = saved.currentPlayer;
        this.gameOver = saved.gameOver;
        this.matchState = saved.matchState;
        this.enPassantTarget = saved.enPassantTarget || null;
        this.castlingRights = saved.castlingRights || { white: { k: true, q: true }, black: { k: true, q: true } };
        this.onlineMode = false;
        this.myRole = null;
        this.challengeEngine.deserializeState(saved.challengeState);

        if (this.gameOver) {
            clearGameState();
            this.screenManager.show('mode');
            return;
        }

        this.screenManager.show('game');
        this.renderBoard();
        this.screenManager.updateChallengeDisplay(this.matchState, false, null, this.currentPlayer);
        this.updateUI();
    }

    persistState() {
        if (this.onlineMode || this.gameOver) return;
        saveGameState({
            board: this.board.toJSON(),
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            matchState: this.matchState,
            enPassantTarget: this.enPassantTarget,
            castlingRights: this.castlingRights,
            onlineMode: this.onlineMode,
            challengeState: this.challengeEngine.serializeState()
        });
    }

    startLocalMatch() {
        this.onlineMode = false;
        this.myRole = null;
        const whiteDiff = document.getElementById('white-difficulty').value;
        const blackDiff = document.getElementById('black-difficulty').value;
        this.matchState = assignChallenges(whiteDiff, blackDiff);
        this.board.reset();
        this.currentPlayer = 'white';
        this.gameOver = false;
        this.enPassantTarget = null;
        this.castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
        this.challengeEngine.resetState();
        this._lastWinner = null;
        this._lastVictoryReason = null;

        this.screenManager.show('game');
        this.renderBoard();
        this.screenManager.updateChallengeDisplay(this.matchState, false, null, this.currentPlayer);
        this.updateUI();
        this.persistState();
    }

    showOnlineLobby() {
        document.getElementById('room-code-display').style.display = 'none';
        document.getElementById('join-error').style.display = 'none';
        this.network.connect();
        this.screenManager.show('lobby');
    }

    setupNetworkCallbacks() {
        this.network.on('gameCreated', (data) => {
            this.myRole = data.role;
            document.getElementById('room-code').textContent = data.code;
            document.getElementById('room-code-display').style.display = 'block';
        });

        this.network.on('joinSuccess', (data) => {
            this.myRole = data.role;
            this.onlineMode = true;
            this.matchState = assignChallenges(data.difficulties.white, data.difficulties.black);
            this.board.reset();
            this.currentPlayer = 'white';
            this.gameOver = false;
            this.enPassantTarget = null;
            this.castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
            this.challengeEngine.resetState();

            this.screenManager.show('game');
            this.renderBoard();
            this.screenManager.updateChallengeDisplay(this.matchState, true, this.myRole, this.currentPlayer);
            this.updateUI();
            this.screenManager.setGameStatus('En attente que Blanc lance la partie...');
        });

        this.network.on('opponentJoined', () => {
            const container = document.getElementById('room-code-display');
            document.querySelector('.waiting').textContent = 'Adversaire connecté !';
            if (!container.querySelector('.start-online-btn')) {
                const btn = document.createElement('button');
                btn.className = 'btn-primary start-online-btn';
                btn.textContent = 'Lancer la partie';
                btn.style.marginTop = '10px';
                btn.onclick = () => this.startOnlineGame();
                container.appendChild(btn);
            }
        });

        this.network.on('gameState', (state) => this.applyRemoteState(state));

        this.network.on('joinError', (msg) => {
            document.getElementById('join-error').textContent = msg;
            document.getElementById('join-error').style.display = 'block';
        });

        this.network.on('opponentLeft', () => {
            if (!this.gameOver) {
                this.gameOver = true;
                const winner = this.myRole === 'white' ? 'Blanc' : 'Noir';
                this._lastVictoryReason = 'L\'adversaire a quitté la partie (abandon).';
                this.screenManager.setGameStatus(`L'adversaire a quitté. ${winner} gagne par abandon !`);
                this.showVictory(winner);
            }
        });
    }

    createOnlineGame() {
        const whiteDiff = document.getElementById('online-white-difficulty').value;
        const blackDiff = document.getElementById('online-black-difficulty').value;
        this.network.createGame({ white: whiteDiff, black: blackDiff });
    }

    joinOnlineGame() {
        const code = document.getElementById('join-code-input').value.trim().toUpperCase();
        if (code.length !== 6) {
            document.getElementById('join-error').textContent = 'Code invalide (6 caractères)';
            document.getElementById('join-error').style.display = 'block';
            return;
        }
        this.network.joinGame(code);
    }

    startOnlineGame() {
        this.onlineMode = true;
        const whiteDiff = document.getElementById('online-white-difficulty').value;
        const blackDiff = document.getElementById('online-black-difficulty').value;
        this.matchState = assignChallenges(whiteDiff, blackDiff);
        this.board.reset();
        this.currentPlayer = 'white';
        this.gameOver = false;
        this.enPassantTarget = null;
        this.castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
        this.challengeEngine.resetState();

        this.network.emitStartGame(this.serializeState());
        this.screenManager.show('game');
        this.renderBoard();
        this.screenManager.updateChallengeDisplay(this.matchState, true, this.myRole, this.currentPlayer);
        this.updateUI();
    }

    getDisplayPerspective() {
        if (this.onlineMode && this.myRole) return this.myRole;
        return this.currentPlayer;
    }

    shouldFlipBoard() {
        if (this.onlineMode && this.myRole) return this.myRole === 'black';
        return this.currentPlayer === 'black';
    }

    renderBoard() {
        const perspective = this.getDisplayPerspective();
        this.renderer.render(this.board, {
            shouldFlip: this.shouldFlipBoard(),
            getDisplaySymbol: (piece) => this.challengeEngine.getDisplaySymbol(piece, perspective, this.matchState),
            onSquareClick: (row, col) => this.handleSquareClick(row, col),
            moveCount: this.challengeEngine.state.moveCount
        });
        this.screenManager.updateChallengeAlerts(this.challengeEngine.state);
        this.screenManager.updateChallengeDisplay(this.matchState, this.onlineMode, this.myRole, this.currentPlayer);
        this.updateUI();
    }

    updateUI() {
        this.screenManager.updateCurrentPlayer(this.currentPlayer, this.onlineMode, this.myRole);
        if (isKingInCheck(this.board, this.currentPlayer)) {
            this.renderer.highlightCheck(this.board.findKing(this.currentPlayer));
        }
    }

    getMoveFilter() {
        this.challengeEngine._board = this.board;
        return this.challengeEngine.getMoveFilter(this.matchState);
    }

    getValidMovesForPiece(row, col) {
        return getValidMoves(this.board, row, col, this.enPassantTarget, this.castlingRights, this.currentPlayer, this.getMoveFilter());
    }

    canSelectPiece(row, col) {
        return this.challengeEngine.canSelectPiece(row, col, this.board, this.currentPlayer, this.matchState, this.enPassantTarget, this.castlingRights);
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;
        if (this.onlineMode && this.currentPlayer !== this.myRole) return;

        const piece = this.board.getPiece(row, col);

        if (this.renderer.selectedSquare) {
            const [selRow, selCol] = this.renderer.selectedSquare;

            if (selRow === row && selCol === col) {
                this.renderer.clearSelection();
                return;
            }

            if (piece && piece.color === this.currentPlayer) {
                this.renderer.clearSelection();
                if (this.canSelectPiece(row, col)) {
                    this.renderer.selectSquare(row, col);
                    this.renderer.showPossibleMoves(this.getValidMovesForPiece(row, col), this.board);
                }
                return;
            }

            const validMoves = this.getValidMovesForPiece(selRow, selCol);
            if (validMoves.some(([r, c]) => r === row && c === col)) {
                this.makeMove(selRow, selCol, row, col);
                this.renderer.clearSelection();
            }
        } else {
            if (piece && piece.color === this.currentPlayer && this.canSelectPiece(row, col)) {
                this.renderer.selectSquare(row, col);
                this.renderer.showPossibleMoves(this.getValidMovesForPiece(row, col), this.board);
            }
        }
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board.getPiece(fromRow, fromCol);
        let captured = this.board.getPiece(toRow, toCol);
        const color = piece.color;

        this.enPassantTarget = null;

        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            const rookCol = toCol === 6 ? 7 : 0;
            const rookNewCol = toCol === 6 ? 5 : 3;
            this.board.setPiece(fromRow, rookNewCol, this.board.getPiece(fromRow, rookCol));
            this.board.setPiece(fromRow, rookCol, null);
        }

        if (piece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !captured) {
            captured = this.board.getPiece(fromRow, toCol) || null;
            if (captured) this.board.setPiece(fromRow, toCol, null);
        }

        this.board.setPiece(toRow, toCol, piece);
        this.board.setPiece(fromRow, fromCol, null);

        if (piece.type === 'pawn' && Math.abs(fromRow - toRow) === 2) {
            this.enPassantTarget = [color === 'white' ? toRow + 1 : toRow - 1, toCol];
        }
        if (piece.type === 'king') this.castlingRights[color] = { k: false, q: false };
        if (piece.type === 'rook') {
            if (fromCol === 0) this.castlingRights[color].q = false;
            if (fromCol === 7) this.castlingRights[color].k = false;
        }

        const isPromotion = piece.type === 'pawn' && ((color === 'white' && toRow === 0) || (color === 'black' && toRow === 7));
        if (isPromotion) {
            this._promotionContext = { toRow, toCol, color, fromRow, fromCol, piece, captured };
            this.screenManager.showPromotionModal();
            return;
        }

        this.finishMove(fromRow, fromCol, toRow, toCol, piece, captured, color);
    }

    completePromotion(pieceType) {
        const ctx = this._promotionContext;
        if (!ctx) return;
        this.screenManager.hidePromotionModal();
        this._promotionContext = null;

        const pawn = this.board.getPiece(ctx.toRow, ctx.toCol);
        if (pawn?._pawnId === undefined && pawn?.type === 'pawn') {
            pawn._pawnId = `${ctx.fromRow}-${ctx.fromCol}`;
            this.challengeEngine.state.activatedPawnIds[ctx.color].add(pawn._pawnId);
        }

        const symbols = {
            queen: [PIECES.WHITE_QUEEN, PIECES.BLACK_QUEEN],
            rook: [PIECES.WHITE_ROOK, PIECES.BLACK_ROOK],
            bishop: [PIECES.WHITE_BISHOP, PIECES.BLACK_BISHOP],
            knight: [PIECES.WHITE_KNIGHT, PIECES.BLACK_KNIGHT]
        };
        const sym = ctx.color === 'white' ? symbols[pieceType][0] : symbols[pieceType][1];
        this.board.setPiece(ctx.toRow, ctx.toCol, { type: pieceType, color: ctx.color, symbol: sym });
        this.finishMove(ctx.fromRow, ctx.fromCol, ctx.toRow, ctx.toCol, this.board.getPiece(ctx.toRow, ctx.toCol), ctx.captured, ctx.color);
    }

    finishMove(fromRow, fromCol, toRow, toCol, piece, captured, color) {
        const oppColor = color === 'white' ? 'black' : 'white';

        this.challengeEngine.updateStateAfterMove(fromRow, fromCol, toRow, toCol, piece, captured, color, this.matchState, this.castlingRights);

        const timedResult = this.challengeEngine.checkTimedChallenges(color, this.matchState, this.board);
        if (timedResult) {
            this.gameOver = true;
            const winner = timedResult.loser === 'white' ? 'Noir' : 'Blanc';
            this._lastWinner = winner;
            this._lastVictoryReason = timedResult.reason;
            this.screenManager.setGameStatus(`${winner} gagne! ${timedResult.reason}`);
            this.emitStateIfOnline();
            this.renderBoard();
            this.showVictory(winner);
            return;
        }

        this.currentPlayer = oppColor;

        const loser = this.challengeEngine.checkChallengeLosses(this.board, this.matchState, this.currentPlayer);
        if (loser) {
            this.gameOver = true;
            const winner = loser === 'white' ? 'Noir' : 'Blanc';
            this._lastWinner = winner;
            this._lastVictoryReason = `Défi non respecté par ${loser === 'white' ? 'Blanc' : 'Noir'}.`;
            this.screenManager.setGameStatus(`${winner} gagne! (défi non respecté)`);
            this.emitStateIfOnline();
            this.renderBoard();
            this.showVictory(winner);
            return;
        }

        const playableMoves = this.challengeEngine.getPlayableMovesForPlayer(
            this.board, this.currentPlayer, this.matchState, this.enPassantTarget, this.castlingRights
        );
        const moveFilter = this.getMoveFilter();
        const allLegalMoves = getAllValidMoves(this.board, this.currentPlayer, this.enPassantTarget, this.castlingRights, moveFilter);
        const inCheck = isKingInCheck(this.board, this.currentPlayer);
        const halfMove = this.challengeEngine.state.moveCount;

        if (playableMoves.length === 0) {
            if (inCheck) {
                const oopsChallenge = this.matchState.whiteChallenge?.id === 'oops' ? 'white' : (this.matchState.blackChallenge?.id === 'oops' ? 'black' : null);
                if (oopsChallenge && oopsChallenge === color) {
                    if (halfMove < 30 || halfMove > 40) {
                        this.gameOver = true;
                        const winner = color === 'white' ? 'Noir' : 'Blanc';
                        this._lastWinner = winner;
                        this._lastVictoryReason = 'Échec et mat hors de la fenêtre des coups 30 à 40 (défi « Oops »).';
                        this.screenManager.setGameStatus(`Mat hors fenêtre 30-40! ${winner} gagne!`);
                        this.emitStateIfOnline();
                        this.renderBoard();
                        this.showVictory(winner);
                        return;
                    }
                }

                this.gameOver = true;
                const winner = this.currentPlayer === 'white' ? 'Noir' : 'Blanc';
                this._lastWinner = winner;
                this._lastVictoryReason = 'Échec et mat.';
                this.screenManager.setGameStatus(`Échec et Mat! ${winner} gagne!`);
                this.emitStateIfOnline();
                this.renderBoard();
                this.showVictory(winner);
                return;
            }

            if (allLegalMoves.length > 0) {
                this.gameOver = true;
                const winner = this.currentPlayer === 'white' ? 'Noir' : 'Blanc';
                this._lastWinner = winner;
                this._lastVictoryReason = `Défi bloquant: ${this.currentPlayer === 'white' ? 'Blanc' : 'Noir'} n'a aucun coup jouable.`;
                this.screenManager.setGameStatus(`${winner} gagne! (défi bloquant)`);
                this.emitStateIfOnline();
                this.renderBoard();
                this.showVictory(winner);
                return;
            }

            const stalemated = this.currentPlayer;
            const oopsPlayer = this.matchState.whiteChallenge?.id === 'oops' ? 'white' : (this.matchState.blackChallenge?.id === 'oops' ? 'black' : null);
            if (oopsPlayer === stalemated) {
                this.gameOver = true;
                const winner = stalemated === 'white' ? 'Noir' : 'Blanc';
                this._lastWinner = winner;
                this._lastVictoryReason = 'Pat. Le joueur avec le défi « Oops » a fait pat (= défaite).';
                this.screenManager.setGameStatus(`Pat ! Oops = défaite. ${winner} gagne!`);
                this.emitStateIfOnline();
                this.renderBoard();
                this.showVictory(winner);
                return;
            }

            this.screenManager.setGameStatus('Pat ! Match nul.');
            this.emitStateIfOnline();
            this.renderBoard();
            return;
        }

        if (inCheck) {
            this.screenManager.setGameStatus('Échec!');
        } else {
            this.screenManager.setGameStatus('');
        }

        this.emitStateIfOnline();
        this.renderBoard();
        this.persistState();
    }

    showVictory(displayWinner) {
        this._lastWinner = displayWinner;
        clearGameState();
        this.screenManager.showVictoryScreen(displayWinner, this.matchState, this._lastVictoryReason);
    }

    serializeState() {
        return {
            board: this.board.toJSON(),
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            matchState: this.matchState,
            enPassantTarget: this.enPassantTarget,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            challengeState: this.challengeEngine.serializeState(),
            gameStatusMessage: this.screenManager.getGameStatus(),
            winner: this.gameOver ? this._lastWinner : null,
            lastVictoryReason: this._lastVictoryReason
        };
    }

    applyRemoteState(state) {
        this.board = Board.fromJSON(state.board);
        this.currentPlayer = state.currentPlayer;
        this.gameOver = state.gameOver;
        this.matchState = state.matchState;
        this.enPassantTarget = state.enPassantTarget || null;
        this.castlingRights = state.castlingRights || { white: { k: true, q: true }, black: { k: true, q: true } };
        this.challengeEngine.deserializeState(state.challengeState || {});

        this.renderer.clearSelection();
        this.renderBoard();
        this.updateUI();

        if (state.gameOver) {
            this.screenManager.setGameStatus(state.gameStatusMessage || '');
            this._lastVictoryReason = state.lastVictoryReason || state.gameStatusMessage || '';
            if (state.winner) this.showVictory(state.winner);
        }
    }

    emitStateIfOnline() {
        if (this.onlineMode && this.network.isConnected()) {
            this.network.emitMove(this.serializeState());
        }
    }

    nextGame() {
        clearGameState();
        if (this.onlineMode) {
            this.onlineMode = false;
            this.myRole = null;
            this.screenManager.show('mode');
            return;
        }
        const lastWinner = (this._lastWinner || '').includes('Blanc') ? 'white' : 'black';
        const currentDiff = lastWinner === 'white' ? this.matchState.whiteDifficulty : this.matchState.blackDifficulty;
        const nextIdx = DIFFICULTY_ORDER.indexOf(currentDiff) + 1;
        if (nextIdx < DIFFICULTY_ORDER.length) {
            const next = DIFFICULTY_ORDER[nextIdx];
            const el = document.getElementById(lastWinner === 'white' ? 'white-difficulty' : 'black-difficulty');
            if (el) el.value = next;
        }
        this.screenManager.show('setup');
    }

    reset() {
        clearGameState();
        this.screenManager.show('setup');
    }
}
