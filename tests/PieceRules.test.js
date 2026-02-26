import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../js/core/Board.js';
import { getMoves } from '../js/core/PieceRules.js';

describe('PieceRules', () => {
    let board;

    beforeEach(() => {
        board = new Board();
    });

    describe('Pawn moves', () => {
        it('should allow white pawn to move 1 or 2 squares from starting row', () => {
            const pawn = board.getPiece(6, 4);
            const moves = getMoves(board, 6, 4, pawn, null, null);
            expect(moves).toContainEqual([5, 4]);
            expect(moves).toContainEqual([4, 4]);
            expect(moves.length).toBe(2);
        });

        it('should allow black pawn to move 1 or 2 squares from starting row', () => {
            const pawn = board.getPiece(1, 4);
            const moves = getMoves(board, 1, 4, pawn, null, null);
            expect(moves).toContainEqual([2, 4]);
            expect(moves).toContainEqual([3, 4]);
            expect(moves.length).toBe(2);
        });

        it('should allow pawn to capture diagonally', () => {
            board.setPiece(5, 3, { type: 'pawn', color: 'black', symbol: '♟' });
            const pawn = board.getPiece(6, 4);
            const moves = getMoves(board, 6, 4, pawn, null, null);
            expect(moves).toContainEqual([5, 3]);
            expect(moves).toContainEqual([5, 4]);
        });

        it('should not move forward if blocked', () => {
            board.setPiece(5, 4, { type: 'pawn', color: 'black', symbol: '♟' });
            const pawn = board.getPiece(6, 4);
            const moves = getMoves(board, 6, 4, pawn, null, null);
            expect(moves).not.toContainEqual([5, 4]);
            expect(moves).not.toContainEqual([4, 4]);
        });

        it('should handle en passant', () => {
            board.setPiece(3, 4, { type: 'pawn', color: 'white', symbol: '♙' });
            board.setPiece(3, 5, { type: 'pawn', color: 'black', symbol: '♟' });
            const enPassantTarget = [2, 5];
            const moves = getMoves(board, 3, 4, board.getPiece(3, 4), enPassantTarget, null);
            expect(moves).toContainEqual([2, 5]);
        });
    });

    describe('Knight moves', () => {
        it('should generate L-shaped moves', () => {
            board.setPiece(4, 4, { type: 'knight', color: 'white', symbol: '♘' });
            board.setPiece(6, 4, null);
            const knight = board.getPiece(4, 4);
            const moves = getMoves(board, 4, 4, knight, null, null);
            expect(moves).toContainEqual([2, 3]);
            expect(moves).toContainEqual([2, 5]);
            expect(moves).toContainEqual([3, 2]);
            expect(moves).toContainEqual([3, 6]);
            expect(moves).toContainEqual([5, 2]);
            expect(moves).toContainEqual([5, 6]);
        });

        it('should capture enemy pieces', () => {
            board.setPiece(4, 4, { type: 'knight', color: 'white', symbol: '♘' });
            board.setPiece(2, 3, { type: 'pawn', color: 'black', symbol: '♟' });
            const moves = getMoves(board, 4, 4, board.getPiece(4, 4), null, null);
            expect(moves).toContainEqual([2, 3]);
        });

        it('should not capture own pieces', () => {
            const knight = board.getPiece(7, 1);
            const moves = getMoves(board, 7, 1, knight, null, null);
            expect(moves).not.toContainEqual([6, 3]);
        });
    });

    describe('Rook moves', () => {
        it('should move in straight lines', () => {
            board.setPiece(4, 4, { type: 'rook', color: 'white', symbol: '♖' });
            const rook = board.getPiece(4, 4);
            const moves = getMoves(board, 4, 4, rook, null, null);
            expect(moves).toContainEqual([3, 4]);
            expect(moves).toContainEqual([2, 4]);
            expect(moves).toContainEqual([4, 3]);
            expect(moves).toContainEqual([4, 5]);
            expect(moves).toContainEqual([5, 4]);
        });

        it('should be blocked by own pieces', () => {
            const rook = board.getPiece(7, 0);
            const moves = getMoves(board, 7, 0, rook, null, null);
            expect(moves.length).toBe(0);
        });
    });

    describe('Bishop moves', () => {
        it('should move diagonally', () => {
            board.setPiece(4, 4, { type: 'bishop', color: 'white', symbol: '♗' });
            const bishop = board.getPiece(4, 4);
            const moves = getMoves(board, 4, 4, bishop, null, null);
            expect(moves).toContainEqual([3, 3]);
            expect(moves).toContainEqual([3, 5]);
            expect(moves).toContainEqual([5, 3]);
            expect(moves).toContainEqual([5, 5]);
        });
    });

    describe('Queen moves', () => {
        it('should combine rook and bishop moves', () => {
            board.setPiece(4, 4, { type: 'queen', color: 'white', symbol: '♕' });
            const queen = board.getPiece(4, 4);
            const moves = getMoves(board, 4, 4, queen, null, null);
            expect(moves).toContainEqual([3, 3]);
            expect(moves).toContainEqual([3, 4]);
            expect(moves).toContainEqual([4, 3]);
            expect(moves.length).toBeGreaterThan(10);
        });
    });

    describe('King moves', () => {
        it('should move one square in all directions', () => {
            board.setPiece(4, 4, { type: 'king', color: 'white', symbol: '♔' });
            board.setPiece(7, 4, null);
            const king = board.getPiece(4, 4);
            const moves = getMoves(board, 4, 4, king, null, null);
            expect(moves).toContainEqual([3, 3]);
            expect(moves).toContainEqual([3, 4]);
            expect(moves).toContainEqual([3, 5]);
            expect(moves).toContainEqual([4, 3]);
            expect(moves).toContainEqual([4, 5]);
            expect(moves).toContainEqual([5, 3]);
            expect(moves).toContainEqual([5, 4]);
            expect(moves).toContainEqual([5, 5]);
        });

        it('should allow kingside castling from starting position', () => {
            board.setPiece(7, 5, null);
            board.setPiece(7, 6, null);
            const castling = { white: { k: true, q: true }, black: { k: true, q: true } };
            const moves = getMoves(board, 7, 4, board.getPiece(7, 4), null, castling);
            expect(moves).toContainEqual([7, 6]);
        });

        it('should allow queenside castling from starting position', () => {
            board.setPiece(7, 1, null);
            board.setPiece(7, 2, null);
            board.setPiece(7, 3, null);
            const castling = { white: { k: true, q: true }, black: { k: true, q: true } };
            const moves = getMoves(board, 7, 4, board.getPiece(7, 4), null, castling);
            expect(moves).toContainEqual([7, 2]);
        });

        it('should not castle when rights are revoked', () => {
            board.setPiece(7, 5, null);
            board.setPiece(7, 6, null);
            const castling = { white: { k: false, q: false }, black: { k: true, q: true } };
            const moves = getMoves(board, 7, 4, board.getPiece(7, 4), null, castling);
            expect(moves).not.toContainEqual([7, 6]);
        });
    });
});
