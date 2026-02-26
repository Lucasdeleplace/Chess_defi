import { BOARD_SIZE } from './Board.js';
import { getMoves } from './PieceRules.js';

export function isKingInCheck(board, color) {
    const kingPos = board.findKing(color);
    if (!kingPos) return false;
    const [kingRow, kingCol] = kingPos;
    const oppColor = color === 'white' ? 'black' : 'white';

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = board.getPiece(row, col);
            if (piece && piece.color === oppColor) {
                const moves = getMoves(board, row, col, piece, null, null);
                if (moves.some(([mr, mc]) => mr === kingRow && mc === kingCol)) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function isSquareAttacked(board, row, col, byColor) {
    const oppColor = byColor === 'white' ? 'black' : 'white';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board.getPiece(r, c);
            if (p && p.color === oppColor) {
                const pMoves = getMoves(board, r, c, p, null, null);
                if (pMoves.some(([mr, mc]) => mr === row && mc === col)) return true;
            }
        }
    }
    return false;
}

export function isMoveSafe(board, fromRow, fromCol, toRow, toCol, currentPlayer, enPassantTarget) {
    const movingPiece = board.getPiece(fromRow, fromCol);
    const originalPiece = board.getPiece(toRow, toCol);
    let enPassantPawn = null;
    let rookFrom = null, rookTo = null;

    if (movingPiece?.type === 'king' && Math.abs(toCol - fromCol) === 2) {
        rookFrom = [fromRow, toCol === 6 ? 7 : 0];
        rookTo = [fromRow, toCol === 6 ? 5 : 3];
        board.setPiece(rookTo[0], rookTo[1], board.getPiece(rookFrom[0], rookFrom[1]));
        board.setPiece(rookFrom[0], rookFrom[1], null);
    }

    if (movingPiece?.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !originalPiece && enPassantTarget) {
        const [epRow, epCol] = enPassantTarget;
        if (toRow === epRow && toCol === epCol) {
            enPassantPawn = board.getPiece(fromRow, toCol);
            board.setPiece(fromRow, toCol, null);
        }
    }

    board.setPiece(toRow, toCol, movingPiece);
    board.setPiece(fromRow, fromCol, null);

    const isSafe = !isKingInCheck(board, currentPlayer);

    board.setPiece(fromRow, fromCol, movingPiece);
    board.setPiece(toRow, toCol, originalPiece);
    if (enPassantPawn) board.setPiece(fromRow, toCol, enPassantPawn);
    if (rookFrom) {
        board.setPiece(rookFrom[0], rookFrom[1], board.getPiece(rookTo[0], rookTo[1]));
        board.setPiece(rookTo[0], rookTo[1], null);
    }

    return isSafe;
}

export function moveGivesCheck(board, from, to) {
    const piece = board.getPiece(from[0], from[1]);
    if (!piece) return false;
    const oppColor = piece.color === 'white' ? 'black' : 'white';
    const orig = board.getPiece(to[0], to[1]);
    board.setPiece(to[0], to[1], piece);
    board.setPiece(from[0], from[1], null);
    const check = isKingInCheck(board, oppColor);
    board.setPiece(from[0], from[1], piece);
    board.setPiece(to[0], to[1], orig);
    return check;
}

export function getValidMoves(board, row, col, enPassantTarget, castlingRights, currentPlayer, moveFilter) {
    const piece = board.getPiece(row, col);
    if (!piece) return [];

    let moves = getMoves(board, row, col, piece, enPassantTarget, castlingRights);
    moves = moves.filter(([nr, nc]) => isMoveSafe(board, row, col, nr, nc, currentPlayer, enPassantTarget));
    if (moveFilter) {
        moves = moveFilter(moves, row, col, piece);
    }
    return moves;
}

export function getAllValidMoves(board, color, enPassantTarget, castlingRights, moveFilter) {
    const result = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board.getPiece(r, c);
            if (p && p.color === color) {
                const moves = getValidMoves(board, r, c, enPassantTarget, castlingRights, color, moveFilter);
                for (const [nr, nc] of moves) {
                    result.push({ from: [r, c], to: [nr, nc], piece: p });
                }
            }
        }
    }
    return result;
}
