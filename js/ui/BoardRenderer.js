import { BOARD_SIZE } from '../core/Board.js';

export class BoardRenderer {
    constructor(boardElementId) {
        this.boardElement = document.getElementById(boardElementId);
        this.selectedSquare = null;
    }

    render(board, { shouldFlip, getDisplaySymbol, onSquareClick, moveCount }) {
        this.boardElement.innerHTML = '';
        const flip = shouldFlip;

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

                const piece = board.getPiece(row, col);
                if (piece) {
                    square.textContent = getDisplaySymbol(piece, row, col);
                    square.classList.add(piece.color === 'white' ? 'piece-white' : 'piece-black');
                }

                square.addEventListener('click', () => onSquareClick(row, col));
                wrapper.appendChild(square);
            }
        }

        this.boardElement.appendChild(wrapper);

        const moveNumEl = document.getElementById('move-number');
        if (moveNumEl) moveNumEl.textContent = Math.floor(moveCount / 2) + 1;
    }

    selectSquare(row, col) {
        this.clearSelection();
        this.selectedSquare = [row, col];
        const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (el) el.classList.add('selected');
    }

    clearSelection() {
        if (this.selectedSquare) {
            const [row, col] = this.selectedSquare;
            const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (el) el.classList.remove('selected');
        }
        this.hidePossibleMoves();
        this.selectedSquare = null;
    }

    showPossibleMoves(moves, board) {
        for (const [moveRow, moveCol] of moves) {
            const el = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
            if (!el) continue;
            if (board.getPiece(moveRow, moveCol)) {
                el.classList.add('possible-capture');
            } else {
                el.classList.add('possible-move');
            }
        }
    }

    hidePossibleMoves() {
        document.querySelectorAll('.possible-move, .possible-capture').forEach(el => {
            el.classList.remove('possible-move', 'possible-capture');
        });
    }

    highlightCheck(kingPos) {
        if (kingPos) {
            const [row, col] = kingPos;
            const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (el) el.classList.add('in-check');
        }
    }
}
