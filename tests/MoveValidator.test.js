import { describe, it, expect, beforeEach } from 'vitest';
import { Board, PIECES } from '../js/core/Board.js';
import { isKingInCheck, isMoveSafe, moveGivesCheck, getValidMoves, getAllValidMoves } from '../js/core/MoveValidator.js';

describe('MoveValidator', () => {
    let board;

    beforeEach(() => {
        board = new Board();
    });

    describe('isKingInCheck', () => {
        it('should return false in starting position', () => {
            expect(isKingInCheck(board, 'white')).toBe(false);
            expect(isKingInCheck(board, 'black')).toBe(false);
        });

        it('should detect check from a rook', () => {
            board.setPiece(4, 4, { type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK });
            board.setPiece(7, 4, null);
            board.setPiece(6, 4, null);
            board.setPiece(5, 4, { type: 'king', color: 'white', symbol: PIECES.WHITE_KING });
            expect(isKingInCheck(board, 'white')).toBe(true);
        });

        it('should not detect check when blocked', () => {
            board.setPiece(4, 4, { type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK });
            expect(isKingInCheck(board, 'white')).toBe(false);
        });
    });

    describe('isMoveSafe', () => {
        it('should allow moves that do not expose the king', () => {
            const result = isMoveSafe(board, 6, 4, 4, 4, 'white', null);
            expect(result).toBe(true);
        });

        it('should block moves that expose the king', () => {
            // Set up: white king on e1, white pawn on e2 pinned by black rook on e8
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board.setPiece(r, c, null);
            board.setPiece(7, 4, { type: 'king', color: 'white', symbol: PIECES.WHITE_KING });
            board.setPiece(6, 4, { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN });
            board.setPiece(0, 4, { type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK });
            board.setPiece(0, 0, { type: 'king', color: 'black', symbol: PIECES.BLACK_KING });

            // Pawn moving sideways would expose king
            const result = isMoveSafe(board, 6, 4, 5, 3, 'white', null);
            expect(result).toBe(false);
        });
    });

    describe('moveGivesCheck', () => {
        it('should detect when a move gives check', () => {
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board.setPiece(r, c, null);
            board.setPiece(7, 0, { type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK });
            board.setPiece(0, 4, { type: 'king', color: 'black', symbol: PIECES.BLACK_KING });
            board.setPiece(7, 4, { type: 'king', color: 'white', symbol: PIECES.WHITE_KING });

            const result = moveGivesCheck(board, [7, 0], [0, 0]);
            expect(result).toBe(true);
        });

        it('should return false when move does not give check', () => {
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board.setPiece(r, c, null);
            board.setPiece(7, 0, { type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK });
            board.setPiece(0, 4, { type: 'king', color: 'black', symbol: PIECES.BLACK_KING });
            board.setPiece(7, 4, { type: 'king', color: 'white', symbol: PIECES.WHITE_KING });

            const result = moveGivesCheck(board, [7, 0], [6, 0]);
            expect(result).toBe(false);
        });
    });

    describe('getValidMoves', () => {
        it('should return valid moves for a white pawn', () => {
            const moves = getValidMoves(board, 6, 4, null, null, 'white', null);
            expect(moves).toContainEqual([5, 4]);
            expect(moves).toContainEqual([4, 4]);
        });

        it('should filter out unsafe moves', () => {
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board.setPiece(r, c, null);
            board.setPiece(7, 4, { type: 'king', color: 'white', symbol: PIECES.WHITE_KING });
            board.setPiece(6, 4, { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN });
            board.setPiece(0, 4, { type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK });
            board.setPiece(0, 0, { type: 'king', color: 'black', symbol: PIECES.BLACK_KING });

            // Pinned pawn can only move along the pin line
            const moves = getValidMoves(board, 6, 4, null, null, 'white', null);
            moves.forEach(([r, c]) => expect(c).toBe(4));
        });

        it('should apply move filter when provided', () => {
            const filter = (moves) => moves.filter(([r]) => r === 5);
            const moves = getValidMoves(board, 6, 4, null, null, 'white', filter);
            expect(moves).toContainEqual([5, 4]);
            expect(moves).not.toContainEqual([4, 4]);
        });
    });

    describe('getAllValidMoves', () => {
        it('should return moves for all pieces of a color', () => {
            const whiteMoves = getAllValidMoves(board, 'white', null, null, null);
            expect(whiteMoves.length).toBe(20); // 16 pawn moves + 4 knight moves
        });

        it('should return moves for black', () => {
            const blackMoves = getAllValidMoves(board, 'black', null, null, null);
            expect(blackMoves.length).toBe(20);
        });
    });
});
