import { describe, it, expect, beforeEach } from 'vitest';
import { Board, BOARD_SIZE, PIECES } from '../js/core/Board.js';

describe('Board', () => {
    let board;

    beforeEach(() => {
        board = new Board();
    });

    describe('createInitialGrid', () => {
        it('should create an 8x8 grid', () => {
            expect(board.grid.length).toBe(BOARD_SIZE);
            board.grid.forEach(row => expect(row.length).toBe(BOARD_SIZE));
        });

        it('should place black pieces on rows 0-1', () => {
            expect(board.getPiece(0, 0)).toEqual({ type: 'rook', color: 'black', symbol: PIECES.BLACK_ROOK });
            expect(board.getPiece(0, 4)).toEqual({ type: 'king', color: 'black', symbol: PIECES.BLACK_KING });
            for (let i = 0; i < BOARD_SIZE; i++) {
                expect(board.getPiece(1, i).type).toBe('pawn');
                expect(board.getPiece(1, i).color).toBe('black');
            }
        });

        it('should place white pieces on rows 6-7', () => {
            expect(board.getPiece(7, 0)).toEqual({ type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK });
            expect(board.getPiece(7, 4)).toEqual({ type: 'king', color: 'white', symbol: PIECES.WHITE_KING });
            for (let i = 0; i < BOARD_SIZE; i++) {
                expect(board.getPiece(6, i).type).toBe('pawn');
                expect(board.getPiece(6, i).color).toBe('white');
            }
        });

        it('should have empty squares in rows 2-5', () => {
            for (let row = 2; row <= 5; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    expect(board.getPiece(row, col)).toBeNull();
                }
            }
        });
    });

    describe('isInBounds', () => {
        it('should return true for valid coordinates', () => {
            expect(board.isInBounds(0, 0)).toBe(true);
            expect(board.isInBounds(7, 7)).toBe(true);
            expect(board.isInBounds(3, 4)).toBe(true);
        });

        it('should return false for out-of-bounds coordinates', () => {
            expect(board.isInBounds(-1, 0)).toBe(false);
            expect(board.isInBounds(0, -1)).toBe(false);
            expect(board.isInBounds(8, 0)).toBe(false);
            expect(board.isInBounds(0, 8)).toBe(false);
        });
    });

    describe('getPiece / setPiece', () => {
        it('should get and set pieces correctly', () => {
            const piece = { type: 'queen', color: 'white', symbol: PIECES.WHITE_QUEEN };
            board.setPiece(4, 4, piece);
            expect(board.getPiece(4, 4)).toEqual(piece);
        });

        it('should return null for out-of-bounds getPiece', () => {
            expect(board.getPiece(-1, 0)).toBeNull();
        });

        it('should clear a square by setting null', () => {
            board.setPiece(6, 0, null);
            expect(board.getPiece(6, 0)).toBeNull();
        });
    });

    describe('findKing', () => {
        it('should find the white king at starting position', () => {
            expect(board.findKing('white')).toEqual([7, 4]);
        });

        it('should find the black king at starting position', () => {
            expect(board.findKing('black')).toEqual([0, 4]);
        });

        it('should return null if king is absent', () => {
            board.setPiece(7, 4, null);
            expect(board.findKing('white')).toBeNull();
        });
    });

    describe('reset', () => {
        it('should restore the board to initial state', () => {
            board.setPiece(4, 4, { type: 'queen', color: 'white', symbol: '♕' });
            board.setPiece(6, 0, null);
            board.reset();
            expect(board.getPiece(4, 4)).toBeNull();
            expect(board.getPiece(6, 0).type).toBe('pawn');
        });
    });

    describe('forEachPiece', () => {
        it('should iterate over all 32 pieces', () => {
            let count = 0;
            board.forEachPiece(() => count++);
            expect(count).toBe(32);
        });
    });

    describe('toJSON / fromJSON', () => {
        it('should serialize and deserialize correctly', () => {
            board.setPiece(4, 4, { type: 'knight', color: 'white', symbol: PIECES.WHITE_KNIGHT });
            const json = board.toJSON();
            const restored = Board.fromJSON(json);
            expect(restored.getPiece(4, 4).type).toBe('knight');
            expect(restored.getPiece(0, 0).type).toBe('rook');
            expect(restored.getPiece(3, 3)).toBeNull();
        });
    });
});
