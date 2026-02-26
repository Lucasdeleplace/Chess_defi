import { BOARD_SIZE } from '../core/Board.js';
import { getMoves } from '../core/PieceRules.js';
import { getValidMoves, getAllValidMoves } from '../core/MoveValidator.js';
import { challengeHandlers, PIECE_TYPE_ORDER, setGetMovesFn } from './ChallengeRegistry.js';

export class ChallengeEngine {
    constructor() {
        this.state = this.createInitialState();
        setGetMovesFn((board, r, c, p) => getMoves(board, r, c, p, null, null));
    }

    createInitialState() {
        return {
            moveCount: 0,
            activatedPawnIds: { white: new Set(), black: new Set() },
            lastPieceType: { white: null, black: null },
            kingMovedLastTurns: { white: 0, black: 0 },
            mustContinueCapture: { white: false, black: false },
            mustMoveBackward: { white: false, black: false },
            touchedTargetSquares: { white: { d8: false, e8: false }, black: { d1: false, e1: false } },
            pieceMoveCount: {},
            frozenPieceTypes: { white: {}, black: {} },
            lavaRow: null,
            targetSquare: null,
            pieceTypeIndex: { white: 0, black: 0 },
            lastOpponentMove: null,
            capturedRookBy: { white: false, black: false },
            lastLandingSquareColor: { white: null, black: null },
        };
    }

    resetState() {
        this.state = this.createInitialState();
    }

    getChallengeForColor(color, matchState) {
        return color === 'white' ? matchState.whiteChallenge : matchState.blackChallenge;
    }

    getMoveFilter(matchState) {
        return (moves, fromRow, fromCol, piece) => {
            const challenge = this.getChallengeForColor(piece.color, matchState);
            if (!challenge) return moves;
            const handler = challengeHandlers[challenge.id];
            if (handler?.filterMoves) {
                return handler.filterMoves(moves, fromRow, fromCol, piece, this._board, this.state);
            }
            return moves;
        };
    }

    canSelectPiece(row, col, board, currentPlayer, matchState, enPassantTarget, castlingRights) {
        const piece = board.getPiece(row, col);
        if (!piece || piece.color !== currentPlayer) return false;

        const challenge = this.getChallengeForColor(piece.color, matchState);
        if (!challenge) return true;

        const handler = challengeHandlers[challenge.id];
        if (!handler?.canSelect) return true;

        this._board = board;
        const moveFilter = this.getMoveFilter(matchState);
        const allMoves = getAllValidMoves(board, currentPlayer, enPassantTarget, castlingRights, moveFilter);

        const getValidMovesFn = (r, c) => {
            return getValidMoves(board, r, c, enPassantTarget, castlingRights, currentPlayer, moveFilter);
        };

        return handler.canSelect(row, col, piece, board, this.state, allMoves, getValidMovesFn);
    }

    getPlayableMovesForPlayer(board, color, matchState, enPassantTarget, castlingRights) {
        this._board = board;
        const moveFilter = this.getMoveFilter(matchState);
        const result = [];

        const allMoves = getAllValidMoves(board, color, enPassantTarget, castlingRights, moveFilter);

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const piece = board.getPiece(r, c);
                if (!piece || piece.color !== color) continue;

                const challenge = this.getChallengeForColor(color, matchState);
                let selectable = true;

                if (challenge) {
                    const handler = challengeHandlers[challenge.id];
                    if (handler?.canSelect) {
                        const getValidMovesFn = (row, col) => {
                            return getValidMoves(board, row, col, enPassantTarget, castlingRights, color, moveFilter);
                        };
                        selectable = handler.canSelect(r, c, piece, board, this.state, allMoves, getValidMovesFn);
                    }
                }

                if (selectable) {
                    const moves = getValidMoves(board, r, c, enPassantTarget, castlingRights, color, moveFilter);
                    for (const [nr, nc] of moves) {
                        result.push({ from: [r, c], to: [nr, nc], piece });
                    }
                }
            }
        }
        return result;
    }

    updateStateAfterMove(fromRow, fromCol, toRow, toCol, piece, captured, color, matchState, castlingRights) {
        const s = this.state;
        const oppColor = color === 'white' ? 'black' : 'white';

        s.moveCount++;
        s.lastOpponentMove = { from: [fromRow, fromCol], to: [toRow, toCol], piece };

        if (piece.type === 'pawn' && piece._pawnId === undefined) {
            piece._pawnId = `${fromRow}-${fromCol}`;
            s.activatedPawnIds[color].add(piece._pawnId);
        }

        s.lastPieceType[color] = piece.type;

        if (piece.type === 'king') s.kingMovedLastTurns[color] = 3;
        else s.kingMovedLastTurns[color] = Math.max(0, (s.kingMovedLastTurns[color] || 0) - 1);

        const pkey = `${fromRow}-${fromCol}`;
        s.pieceMoveCount[pkey] = (s.pieceMoveCount[pkey] || 0) + 1;

        if (captured) {
            s.mustMoveBackward[color] = true;
            const chall = this.getChallengeForColor(color, matchState);
            if (chall?.id === 'adepte_captures') s.mustContinueCapture[color] = true;
            if (captured.type === 'rook') {
                s.capturedRookBy[color] = true;
                if (toRow === (oppColor === 'white' ? 7 : 0)) {
                    if (toCol === 0) castlingRights[oppColor].q = false;
                    if (toCol === 7) castlingRights[oppColor].k = false;
                }
            }
            if (matchState.blackChallenge?.id === 'refus_participation' && color === 'white') {
                s.frozenPieceTypes.black[captured.type] = 4;
            }
            if (matchState.whiteChallenge?.id === 'refus_participation' && color === 'black') {
                s.frozenPieceTypes.white[captured.type] = 4;
            }
        } else {
            s.mustMoveBackward[color] = false;
            s.mustContinueCapture[color] = false;
        }

        if (this.getChallengeForColor(color, matchState)?.id === 'mon_tour') {
            s.pieceTypeIndex[color] = (s.pieceTypeIndex[color] + 1) % PIECE_TYPE_ORDER.length;
        }

        for (const c of ['white', 'black']) {
            for (const t of Object.keys(s.frozenPieceTypes[c])) {
                if (s.frozenPieceTypes[c][t] > 0) s.frozenPieceTypes[c][t]--;
            }
        }

        if (toRow === 0 && (toCol === 3 || toCol === 4)) s.touchedTargetSquares.white[toCol === 3 ? 'd8' : 'e8'] = true;
        if (toRow === 7 && (toCol === 3 || toCol === 4)) s.touchedTargetSquares.black[toCol === 3 ? 'd1' : 'e1'] = true;

        const halfMove = s.moveCount;
        if (matchState.whiteChallenge?.id === 'lave_montante' || matchState.blackChallenge?.id === 'lave_montante') {
            if (halfMove % 20 === 0 && halfMove > 0) {
                s.lavaRow = s.lavaRow === null ? 7 : s.lavaRow - 1;
            }
        }

        s.lastLandingSquareColor[color] = (toRow + toCol) % 2;

        if (matchState.whiteChallenge?.id === 'cible_vue' || matchState.blackChallenge?.id === 'cible_vue') {
            if (halfMove % 7 === 0 && halfMove > 0) {
                s.targetSquare = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
            }
        }
    }

    checkTimedChallenges(color, matchState, board) {
        const s = this.state;
        const halfMove = s.moveCount;

        if (matchState.whiteChallenge?.id === 'cible_vue' || matchState.blackChallenge?.id === 'cible_vue') {
            if (halfMove % 7 === 0 && halfMove > 7 && s.targetSquare) {
                const challenger = matchState.whiteChallenge?.id === 'cible_vue' ? 'white' : 'black';
                const reached = board.getPiece(s.targetSquare[0], s.targetSquare[1])?.color === challenger;
                if (!reached) {
                    return { loser: challenger, reason: 'La cible du défi n\'a pas été atteinte à temps.' };
                }
            }
        }

        if (halfMove >= 18) {
            if (matchState.whiteChallenge?.id === 'stresse_tours' && !s.capturedRookBy.white) {
                return { loser: 'white', reason: 'Blanc n\'a pas capturé de tour (défi « Stressé des tours »).' };
            }
            if (matchState.blackChallenge?.id === 'stresse_tours' && !s.capturedRookBy.black) {
                return { loser: 'black', reason: 'Noir n\'a pas capturé de tour (défi « Stressé des tours »).' };
            }
        }

        if (halfMove >= 20) {
            if (matchState.whiteChallenge?.id === 'determination' && (!s.touchedTargetSquares.white.d8 || !s.touchedTargetSquares.white.e8)) {
                return { loser: 'white', reason: 'Blanc n\'a pas atteint les cases d8 et e8 (défi « Détermination »).' };
            }
            if (matchState.blackChallenge?.id === 'determination' && (!s.touchedTargetSquares.black.d1 || !s.touchedTargetSquares.black.e1)) {
                return { loser: 'black', reason: 'Noir n\'a pas atteint les cases d1 et e1 (défi « Détermination »).' };
            }
        }

        return null;
    }

    checkChallengeLosses(board, matchState, _currentPlayer) {
        for (const color of ['white', 'black']) {
            const challenge = this.getChallengeForColor(color, matchState);
            if (!challenge) continue;

            const handler = challengeHandlers[challenge.id];
            if (handler?.checkLoss && handler.checkLoss(color, board, this.state)) {
                return color;
            }
        }
        return null;
    }

    getDisplaySymbol(piece, viewer, matchState) {
        if (piece.type !== 'queen') return piece.symbol;
        const viewerChallenge = this.getChallengeForColor(viewer, matchState);
        if (viewerChallenge?.id === 'dame_cachee') return '♙';
        return piece.symbol;
    }

    serializeState() {
        const s = this.state;
        return {
            moveCount: s.moveCount,
            activatedPawnIds: {
                white: [...s.activatedPawnIds.white],
                black: [...s.activatedPawnIds.black]
            },
            lastPieceType: { ...s.lastPieceType },
            kingMovedLastTurns: { ...s.kingMovedLastTurns },
            mustContinueCapture: { ...s.mustContinueCapture },
            mustMoveBackward: { ...s.mustMoveBackward },
            touchedTargetSquares: JSON.parse(JSON.stringify(s.touchedTargetSquares)),
            pieceMoveCount: { ...s.pieceMoveCount },
            frozenPieceTypes: JSON.parse(JSON.stringify(s.frozenPieceTypes)),
            lavaRow: s.lavaRow,
            targetSquare: s.targetSquare,
            pieceTypeIndex: { ...s.pieceTypeIndex },
            lastOpponentMove: s.lastOpponentMove,
            capturedRookBy: { ...s.capturedRookBy },
            lastLandingSquareColor: { ...s.lastLandingSquareColor },
        };
    }

    deserializeState(data) {
        this.state = {
            moveCount: data.moveCount || 0,
            activatedPawnIds: {
                white: new Set(data.activatedPawnIds?.white || []),
                black: new Set(data.activatedPawnIds?.black || [])
            },
            lastPieceType: data.lastPieceType || { white: null, black: null },
            kingMovedLastTurns: data.kingMovedLastTurns || { white: 0, black: 0 },
            mustContinueCapture: data.mustContinueCapture || { white: false, black: false },
            mustMoveBackward: data.mustMoveBackward || { white: false, black: false },
            touchedTargetSquares: data.touchedTargetSquares || { white: { d8: false, e8: false }, black: { d1: false, e1: false } },
            pieceMoveCount: data.pieceMoveCount || {},
            frozenPieceTypes: data.frozenPieceTypes || { white: {}, black: {} },
            lavaRow: data.lavaRow ?? null,
            targetSquare: data.targetSquare ?? null,
            pieceTypeIndex: data.pieceTypeIndex || { white: 0, black: 0 },
            lastOpponentMove: data.lastOpponentMove || null,
            capturedRookBy: data.capturedRookBy || { white: false, black: false },
            lastLandingSquareColor: data.lastLandingSquareColor || { white: null, black: null },
        };
    }
}
