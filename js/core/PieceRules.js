import { BOARD_SIZE } from './Board.js';

export function getMoves(board, row, col, piece, enPassantTarget, castlingRights) {
    switch (piece.type) {
        case 'pawn': return getPawnMoves(board, row, col, piece, enPassantTarget);
        case 'rook': return getSlidingMoves(board, row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
        case 'knight': return getKnightMoves(board, row, col, piece);
        case 'bishop': return getSlidingMoves(board, row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        case 'queen': return getSlidingMoves(board, row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]);
        case 'king': return getKingMoves(board, row, col, piece, castlingRights);
        default: return [];
    }
}

function getPawnMoves(board, row, col, piece, enPassantTarget) {
    const moves = [];
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;

    if (board.isInBounds(row + direction, col) && !board.getPiece(row + direction, col)) {
        moves.push([row + direction, col]);
        if (row === startRow && !board.getPiece(row + 2 * direction, col)) {
            moves.push([row + 2 * direction, col]);
        }
    }

    for (const colOffset of [-1, 1]) {
        const newCol = col + colOffset;
        if (!board.isInBounds(row + direction, newCol)) continue;

        const target = board.getPiece(row + direction, newCol);
        if (target && target.color !== piece.color) {
            moves.push([row + direction, newCol]);
        } else if (!target && enPassantTarget) {
            const [epRow, epCol] = enPassantTarget;
            const adjacent = board.getPiece(row, newCol);
            if (row + direction === epRow && newCol === epCol && adjacent?.type === 'pawn' && adjacent?.color !== piece.color) {
                moves.push([row + direction, newCol]);
            }
        }
    }

    return moves;
}

function getSlidingMoves(board, row, col, piece, directions) {
    const moves = [];
    for (const [dRow, dCol] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;
            if (!board.isInBounds(newRow, newCol)) break;

            const target = board.getPiece(newRow, newCol);
            if (!target) {
                moves.push([newRow, newCol]);
            } else {
                if (target.color !== piece.color) moves.push([newRow, newCol]);
                break;
            }
        }
    }
    return moves;
}

function getKnightMoves(board, row, col, piece) {
    const moves = [];
    const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    for (const [dRow, dCol] of offsets) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (board.isInBounds(newRow, newCol)) {
            const target = board.getPiece(newRow, newCol);
            if (!target || target.color !== piece.color) {
                moves.push([newRow, newCol]);
            }
        }
    }
    return moves;
}

function getKingMoves(board, row, col, piece, castlingRights) {
    const moves = [];
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (board.isInBounds(newRow, newCol)) {
            const target = board.getPiece(newRow, newCol);
            if (!target || target.color !== piece.color) {
                moves.push([newRow, newCol]);
            }
        }
    }

    if (!castlingRights) return moves;
    const rights = castlingRights[piece.color];
    if (!rights) return moves;
    const backRow = piece.color === 'white' ? 7 : 0;
    if (row !== backRow || col !== 4) return moves;

    if (rights.k) {
        const f = board.getPiece(backRow, 5);
        const g = board.getPiece(backRow, 6);
        const rook = board.getPiece(backRow, 7);
        if (!f && !g && rook?.type === 'rook' && rook?.color === piece.color) {
            if (!isSquareAttackedRaw(board, backRow, 4, piece.color) &&
                !isSquareAttackedRaw(board, backRow, 5, piece.color) &&
                !isSquareAttackedRaw(board, backRow, 6, piece.color)) {
                moves.push([backRow, 6]);
            }
        }
    }

    if (rights.q) {
        const b = board.getPiece(backRow, 1);
        const c = board.getPiece(backRow, 2);
        const d = board.getPiece(backRow, 3);
        const rook = board.getPiece(backRow, 0);
        if (!b && !c && !d && rook?.type === 'rook' && rook?.color === piece.color) {
            if (!isSquareAttackedRaw(board, backRow, 4, piece.color) &&
                !isSquareAttackedRaw(board, backRow, 3, piece.color) &&
                !isSquareAttackedRaw(board, backRow, 2, piece.color)) {
                moves.push([backRow, 2]);
            }
        }
    }

    return moves;
}

function isSquareAttackedRaw(board, row, col, byColor) {
    const oppColor = byColor === 'white' ? 'black' : 'white';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board.getPiece(r, c);
            if (p && p.color === oppColor) {
                const pMoves = getMovesWithoutCastling(board, r, c, p);
                if (pMoves.some(([mr, mc]) => mr === row && mc === col)) return true;
            }
        }
    }
    return false;
}

function getMovesWithoutCastling(board, row, col, piece) {
    switch (piece.type) {
        case 'pawn': return getPawnMoves(board, row, col, piece, null);
        case 'rook': return getSlidingMoves(board, row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
        case 'knight': return getKnightMoves(board, row, col, piece);
        case 'bishop': return getSlidingMoves(board, row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        case 'queen': return getSlidingMoves(board, row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]);
        case 'king': {
            const moves = [];
            for (const [dRow, dCol] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                const nr = row + dRow, nc = col + dCol;
                if (board.isInBounds(nr, nc)) {
                    const t = board.getPiece(nr, nc);
                    if (!t || t.color !== piece.color) moves.push([nr, nc]);
                }
            }
            return moves;
        }
        default: return [];
    }
}
