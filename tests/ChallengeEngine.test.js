import { describe, it, expect, beforeEach } from 'vitest';
import { Board, PIECES } from '../js/core/Board.js';
import { ChallengeEngine } from '../js/challenges/ChallengeEngine.js';
import { assignChallenges, CHALLENGES, DIFFICULTY_ORDER, PIECE_VALUES } from '../js/challenges/ChallengeRegistry.js';

describe('ChallengeRegistry', () => {
    describe('CHALLENGES', () => {
        it('should have 4 difficulty levels', () => {
            expect(Object.keys(CHALLENGES)).toEqual(['facile', 'moyen', 'difficile', 'impossible']);
        });

        it('should have challenges at each level', () => {
            for (const diff of DIFFICULTY_ORDER) {
                expect(CHALLENGES[diff].length).toBeGreaterThan(0);
            }
        });

        it('should have unique ids across all challenges', () => {
            const ids = new Set();
            for (const diff of DIFFICULTY_ORDER) {
                for (const ch of CHALLENGES[diff]) {
                    expect(ids.has(ch.id)).toBe(false);
                    ids.add(ch.id);
                }
            }
        });

        it('should have name and desc for each challenge', () => {
            for (const diff of DIFFICULTY_ORDER) {
                for (const ch of CHALLENGES[diff]) {
                    expect(ch.name).toBeTruthy();
                    expect(ch.desc).toBeTruthy();
                }
            }
        });
    });

    describe('PIECE_VALUES', () => {
        it('should value queen highest (9)', () => {
            expect(PIECE_VALUES.queen).toBe(9);
        });

        it('should value pawn lowest (1)', () => {
            expect(PIECE_VALUES.pawn).toBe(1);
        });

        it('should value king at 0', () => {
            expect(PIECE_VALUES.king).toBe(0);
        });
    });

    describe('assignChallenges', () => {
        it('should assign different challenges to both players', () => {
            const result = assignChallenges('facile', 'facile');
            expect(result.whiteChallenge).toBeTruthy();
            expect(result.blackChallenge).toBeTruthy();
            if (CHALLENGES.facile.length > 1) {
                expect(result.whiteChallenge.id).not.toBe(result.blackChallenge.id);
            }
        });

        it('should set correct difficulties', () => {
            const result = assignChallenges('moyen', 'difficile');
            expect(result.whiteDifficulty).toBe('moyen');
            expect(result.blackDifficulty).toBe('difficile');
            expect(result.whiteChallenge.difficulty).toBe('moyen');
            expect(result.blackChallenge.difficulty).toBe('difficile');
        });
    });
});

describe('ChallengeEngine', () => {
    let engine;
    let board;

    beforeEach(() => {
        engine = new ChallengeEngine();
        board = new Board();
    });

    describe('state management', () => {
        it('should initialize with correct default state', () => {
            const s = engine.state;
            expect(s.moveCount).toBe(0);
            expect(s.lavaRow).toBeNull();
            expect(s.targetSquare).toBeNull();
            expect(s.lastOpponentMove).toBeNull();
        });

        it('should reset state correctly', () => {
            engine.state.moveCount = 10;
            engine.state.lavaRow = 5;
            engine.resetState();
            expect(engine.state.moveCount).toBe(0);
            expect(engine.state.lavaRow).toBeNull();
        });
    });

    describe('serialization', () => {
        it('should serialize and deserialize state', () => {
            engine.state.moveCount = 15;
            engine.state.lavaRow = 3;
            engine.state.activatedPawnIds.white.add('6-4');
            engine.state.lastPieceType.white = 'pawn';

            const serialized = engine.serializeState();
            engine.resetState();
            engine.deserializeState(serialized);

            expect(engine.state.moveCount).toBe(15);
            expect(engine.state.lavaRow).toBe(3);
            expect(engine.state.activatedPawnIds.white.has('6-4')).toBe(true);
            expect(engine.state.lastPieceType.white).toBe('pawn');
        });
    });

    describe('getDisplaySymbol', () => {
        it('should return normal symbol for non-queen pieces', () => {
            const pawn = { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN };
            const matchState = { whiteChallenge: { id: 'dame_cachee' }, blackChallenge: null };
            expect(engine.getDisplaySymbol(pawn, 'white', matchState)).toBe(PIECES.WHITE_PAWN);
        });

        it('should disguise queen with dame_cachee challenge', () => {
            const queen = { type: 'queen', color: 'white', symbol: PIECES.WHITE_QUEEN };
            const matchState = { whiteChallenge: { id: 'dame_cachee' }, blackChallenge: null };
            expect(engine.getDisplaySymbol(queen, 'white', matchState)).toBe('♙');
        });

        it('should show normal queen without dame_cachee', () => {
            const queen = { type: 'queen', color: 'white', symbol: PIECES.WHITE_QUEEN };
            const matchState = { whiteChallenge: { id: 'drole_reine' }, blackChallenge: null };
            expect(engine.getDisplaySymbol(queen, 'white', matchState)).toBe(PIECES.WHITE_QUEEN);
        });
    });

    describe('drole_reine - queen cannot capture', () => {
        it('should filter out capture moves for queen', () => {
            const matchState = { whiteChallenge: { id: 'drole_reine' }, blackChallenge: null };
            engine._board = board;
            const filter = engine.getMoveFilter(matchState);

            board.setPiece(4, 4, { type: 'queen', color: 'white', symbol: PIECES.WHITE_QUEEN });
            board.setPiece(2, 4, { type: 'pawn', color: 'black', symbol: PIECES.BLACK_PAWN });

            const queen = board.getPiece(4, 4);
            const moves = [[3, 4], [2, 4], [4, 3], [4, 5]];
            const filtered = filter(moves, 4, 4, queen);

            expect(filtered).toContainEqual([3, 4]);
            expect(filtered).not.toContainEqual([2, 4]);
        });
    });

    describe('limitation_vitesse - max 3 squares', () => {
        it('should filter moves beyond 3 squares distance', () => {
            const matchState = { whiteChallenge: { id: 'limitation_vitesse' }, blackChallenge: null };
            engine._board = board;
            const filter = engine.getMoveFilter(matchState);

            const rook = { type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK };
            const moves = [[3, 4], [2, 4], [1, 4], [0, 4]]; // distances 1, 2, 3, 4
            const filtered = filter(moves, 4, 4, rook);

            expect(filtered).toContainEqual([3, 4]);
            expect(filtered).toContainEqual([2, 4]);
            expect(filtered).toContainEqual([1, 4]);
            expect(filtered).not.toContainEqual([0, 4]);
        });
    });

    describe('mauvais_souvenir - no column c', () => {
        it('should filter moves to column c', () => {
            const matchState = { whiteChallenge: { id: 'mauvais_souvenir' }, blackChallenge: null };
            engine._board = board;
            const filter = engine.getMoveFilter(matchState);

            const piece = { type: 'rook', color: 'white', symbol: PIECES.WHITE_ROOK };
            const moves = [[4, 0], [4, 1], [4, 2], [4, 3]];
            const filtered = filter(moves, 4, 4, piece);
            expect(filtered).not.toContainEqual([4, 2]);
            expect(filtered).toContainEqual([4, 0]);
        });
    });

    describe('updateStateAfterMove', () => {
        it('should increment move count', () => {
            const matchState = { whiteChallenge: null, blackChallenge: null };
            const castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
            const piece = { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN };

            engine.updateStateAfterMove(6, 4, 4, 4, piece, null, 'white', matchState, castlingRights);
            expect(engine.state.moveCount).toBe(1);
        });

        it('should track last piece type', () => {
            const matchState = { whiteChallenge: null, blackChallenge: null };
            const castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
            const piece = { type: 'knight', color: 'white', symbol: PIECES.WHITE_KNIGHT };

            engine.updateStateAfterMove(7, 1, 5, 2, piece, null, 'white', matchState, castlingRights);
            expect(engine.state.lastPieceType.white).toBe('knight');
        });

        it('should track king movement turns', () => {
            const matchState = { whiteChallenge: null, blackChallenge: null };
            const castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
            const king = { type: 'king', color: 'white', symbol: PIECES.WHITE_KING };

            engine.updateStateAfterMove(7, 4, 7, 5, king, null, 'white', matchState, castlingRights);
            expect(engine.state.kingMovedLastTurns.white).toBe(3);
        });

        it('should set mustMoveBackward on capture', () => {
            const matchState = { whiteChallenge: null, blackChallenge: null };
            const castlingRights = { white: { k: true, q: true }, black: { k: true, q: true } };
            const piece = { type: 'pawn', color: 'white', symbol: PIECES.WHITE_PAWN };
            const captured = { type: 'pawn', color: 'black', symbol: PIECES.BLACK_PAWN };

            engine.updateStateAfterMove(5, 3, 4, 4, piece, captured, 'white', matchState, castlingRights);
            expect(engine.state.mustMoveBackward.white).toBe(true);
        });
    });

    describe('checkChallengeLosses', () => {
        it('should detect colonne_b loss', () => {
            const matchState = {
                whiteChallenge: { id: 'colonne_b' },
                blackChallenge: null
            };
            // Remove all white pieces from column b
            for (let r = 0; r < 8; r++) {
                const p = board.getPiece(r, 1);
                if (p && p.color === 'white') board.setPiece(r, 1, null);
            }
            const loser = engine.checkChallengeLosses(board, matchState, 'white');
            expect(loser).toBe('white');
        });

        it('should not trigger colonne_b if piece exists', () => {
            const matchState = {
                whiteChallenge: { id: 'colonne_b' },
                blackChallenge: null
            };
            const loser = engine.checkChallengeLosses(board, matchState, 'white');
            expect(loser).toBeNull();
        });

        it('should detect loyaute loss when king is isolated', () => {
            const matchState = {
                whiteChallenge: { id: 'loyaute' },
                blackChallenge: null
            };
            // Clear area around white king
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) board.setPiece(r, c, null);
            board.setPiece(4, 4, { type: 'king', color: 'white', symbol: PIECES.WHITE_KING });
            board.setPiece(0, 0, { type: 'king', color: 'black', symbol: PIECES.BLACK_KING });

            const loser = engine.checkChallengeLosses(board, matchState, 'white');
            expect(loser).toBe('white');
        });
    });
});
