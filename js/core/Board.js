export const BOARD_SIZE = 8;

export const PIECES = {
    WHITE_KING: '♔', WHITE_QUEEN: '♕', WHITE_ROOK: '♖',
    WHITE_BISHOP: '♗', WHITE_KNIGHT: '♘', WHITE_PAWN: '♙',
    BLACK_KING: '♚', BLACK_QUEEN: '♛', BLACK_ROOK: '♜',
    BLACK_BISHOP: '♝', BLACK_KNIGHT: '♞', BLACK_PAWN: '♟'
};

export class Board {
    constructor() {
        this.grid = this.createInitialGrid();
    }

    createInitialGrid() {
        const grid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

        const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        const blackSymbols = [PIECES.BLACK_ROOK, PIECES.BLACK_KNIGHT, PIECES.BLACK_BISHOP, PIECES.BLACK_QUEEN, PIECES.BLACK_KING, PIECES.BLACK_BISHOP, PIECES.BLACK_KNIGHT, PIECES.BLACK_ROOK];
        const whiteSymbols = [PIECES.WHITE_ROOK, PIECES.WHITE_KNIGHT, PIECES.WHITE_BISHOP, PIECES.WHITE_QUEEN, PIECES.WHITE_KING, PIECES.WHITE_BISHOP, PIECES.WHITE_KNIGHT, PIECES.WHITE_ROOK];

        for (let i = 0; i < BOARD_SIZE; i++) {
            grid[0][i] = { type: backRank[i], color: 'black', symbol: blackSymbols[i] };
            grid[1][i] = { type: 'pawn', color: 'black', symbol: PIECES.BLACK_PAWN };
            grid[6][i] = { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN };
            grid[7][i] = { type: backRank[i], color: 'white', symbol: whiteSymbols[i] };
        }

        return grid;
    }

    reset() {
        this.grid = this.createInitialGrid();
    }

    getPiece(row, col) {
        if (!this.isInBounds(row, col)) return null;
        return this.grid[row][col];
    }

    setPiece(row, col, piece) {
        if (this.isInBounds(row, col)) {
            this.grid[row][col] = piece;
        }
    }

    isInBounds(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    findKing(color) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.grid[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    forEachPiece(callback) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.grid[row][col];
                if (piece) callback(piece, row, col);
            }
        }
    }

    toJSON() {
        return this.grid.map(row => row.map(p => p ? { type: p.type, color: p.color, symbol: p.symbol, _pawnId: p._pawnId } : null));
    }

    static fromJSON(data) {
        const board = new Board();
        board.grid = data.map(row => row.map(p => p ? { ...p } : null));
        return board;
    }
}
