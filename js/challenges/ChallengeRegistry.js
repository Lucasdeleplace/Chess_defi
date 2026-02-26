import { BOARD_SIZE } from '../core/Board.js';
import { moveGivesCheck } from '../core/MoveValidator.js';

export const DIFFICULTY_ORDER = ['facile', 'moyen', 'difficile', 'impossible'];

export const PIECE_VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

export const CHALLENGES = {
    facile: [
        { id: 'dame_cachee', name: 'Dame cachée', desc: 'Votre dame et la dame adverse sont remplacées par un pion impossible à distinguer.' },
        { id: 'drole_reine', name: "Drôle de reine !", desc: "Votre dame ne peut rien capturer." },
        { id: '4_pions', name: 'Seulement 4 pions ?', desc: 'Seuls 4 pions peuvent bouger. Une fois un pion déplacé, il peut continuer à bouger.' },
        { id: 'roi_vaillant', name: 'Roi vaillant', desc: "À partir du coup 10, le roi doit être sur la 2ème/7ème rangée et ne peut plus revenir en arrière." },
        { id: 'fous_flemmards', name: 'Fous flemmards', desc: "Les fous ne peuvent pas aller au-delà de la 4ème rangée." },
        { id: 'activation_tour', name: 'Activation tour', desc: "Les tours sont inactives jusqu'au coup 15 : pas de déplacement ni roque." },
        { id: 'manger_manger', name: 'Manger, manger, manger', desc: "Si un pion peut capturer, il est forcé de le faire." },
        { id: 'colonne_b', name: 'Garder la colonne b à tout prix !', desc: "Garder au moins 1 pièce sur la colonne b. Sinon = défaite." }
    ],
    moyen: [
        { id: 'stresse_tours', name: 'Stressé des tours', desc: "Capturer une tour adverse avant le 18ème coup." },
        { id: 'yeux_gros', name: "Les yeux plus gros que le ventre", desc: "Ne pas capturer une pièce si vous pouvez en capturer une de plus grande valeur." },
        { id: 'impasse_mexicaine', name: 'Impasse mexicaine', desc: "Si vos tours sont en vis-à-vis, vous avez perdu." },
        { id: 'limitation_vitesse', name: 'Limitation de vitesse', desc: "Les pièces ne peuvent pas se déplacer à plus de 3 cases." },
        { id: 'case_g4', name: "Case g4 ? Beurk.", desc: "Attaquer la case g4 = défaite." },
        { id: 'diversite', name: 'Diversité', desc: "Ne pas jouer 2 fois de suite le même type de pièce." },
        { id: 'maitre_temps', name: "Maître du temps… mais pas vraiment", desc: "Pas de visibilité des pendules ni incrément. (UI: masqué)" }
    ],
    difficile: [
        { id: 'chef_armees', name: 'Chef des armées', desc: "Les pièces ne peuvent pas aller plus loin que votre pion le plus avancé." },
        { id: 'commandant_bord', name: 'Commandant de bord', desc: "Capturer uniquement si le roi a bougé dans les 3 derniers coups." },
        { id: 'adepte_captures', name: 'Adepte des captures', desc: "Si vous capturez, continuer à capturer aux prochains coups si possible." },
        { id: 'loyaute', name: 'Loyauté', desc: "Le roi doit avoir au moins 3 pièces/pions autour de lui. Sinon = défaite." },
        { id: 'copycat', name: 'Copycat', desc: "Jouer sur la même aile que le dernier coup adverse." },
        { id: 'alternance', name: 'Alternance', desc: "Alterner entre cases blanches et cases noires à chaque coup." },
        { id: 'mauvais_souvenir', name: 'Mauvais souvenir', desc: "Aucune pièce ne peut être sur la colonne c." },
        { id: 'determination', name: 'Détermination', desc: "Avant le coup 20, placer au moins une fois une pièce sur e8, d8, e1 ou d1 adverses." },
        { id: 'obsede_echecs', name: "Obsédé par les échecs", desc: "Si vous pouvez faire échec, vous devez le faire." }
    ],
    impossible: [
        { id: 'copycat_master', name: 'Copycat Master', desc: "Jouer sur la même colonne que le dernier coup adverse (ou une pièce sur cette colonne)." },
        { id: 'oops', name: "Oops…", desc: "Mater uniquement entre les coups 30 et 40. Match nul = défaite." },
        { id: 'cible_vue', name: 'Cible en vue', desc: "Tous les 7 coups, une case aléatoire. Placer une pièce dessus ou défaite." },
        { id: 'lave_montante', name: 'Lave montante', desc: "Tous les 10 coups, lave monte d'une rangée. Pièces bloquées sur cette rangée." },
        { id: 'mon_tour', name: "À mon tour !", desc: "Jouer par ordre : pion, cavalier, fou, tour, dame, roi, répété." },
        { id: 'refus_participation', name: 'Refus de participation', desc: "Quand l'adversaire capture une pièce, ce type ne peut plus bouger pendant 4 coups." },
        { id: 'rapidement_epuise', name: 'Rapidement épuisé', desc: "Chaque pièce ne peut bouger que 3 fois maximum." }
    ]
};

export const PIECE_TYPE_ORDER = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

function getFurthestPawnRow(board, color) {
    let furthest = color === 'white' ? 7 : 0;
    let found = false;
    board.forEachPiece((p, r) => {
        if (p.type === 'pawn' && p.color === color) {
            found = true;
            if (color === 'white' && r < furthest) furthest = r;
            if (color === 'black' && r > furthest) furthest = r;
        }
    });
    return found ? furthest : null;
}

export const challengeHandlers = {
    drole_reine: {
        filterMoves(moves, fromRow, fromCol, piece, board) {
            if (piece.type === 'queen') {
                return moves.filter(([r, c]) => !board.getPiece(r, c));
            }
            return moves;
        }
    },

    manger_manger: {
        filterMoves(moves, fromRow, fromCol, piece, board) {
            if (piece.type === 'pawn') {
                const hasCapture = moves.some(([r, c]) => board.getPiece(r, c));
                if (hasCapture) return moves.filter(([r, c]) => board.getPiece(r, c));
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            const pawnCaptures = allMoves.filter(m => m.piece.type === 'pawn' && board.getPiece(m.to[0], m.to[1]));
            if (pawnCaptures.length > 0) {
                if (piece.type !== 'pawn') return false;
                const myMoves = getValidMovesFn(row, col);
                return myMoves.some(([r, c]) => board.getPiece(r, c));
            }
            return true;
        }
    },

    yeux_gros: {
        filterMoves(moves, fromRow, fromCol, piece, board) {
            const captures = moves.filter(([r, c]) => board.getPiece(r, c));
            if (captures.length > 0) {
                const maxVal = Math.max(...captures.map(([r, c]) => PIECE_VALUES[board.getPiece(r, c)?.type] ?? 0));
                const best = captures.filter(([r, c]) => (PIECE_VALUES[board.getPiece(r, c)?.type] ?? 0) === maxVal);
                const nonCaptures = moves.filter(([r, c]) => !board.getPiece(r, c));
                return [...best, ...nonCaptures];
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            const allCaptures = allMoves.filter(m => board.getPiece(m.to[0], m.to[1]));
            if (allCaptures.length > 0) {
                const maxVal = Math.max(...allCaptures.map(m => PIECE_VALUES[board.getPiece(m.to[0], m.to[1])?.type] ?? 0));
                const myMoves = getValidMovesFn(row, col);
                const myCaptures = myMoves.filter(([r, c]) => board.getPiece(r, c));
                if (myCaptures.length > 0) {
                    const myMax = Math.max(...myCaptures.map(([r, c]) => PIECE_VALUES[board.getPiece(r, c)?.type] ?? 0));
                    if (myMax < maxVal) return false;
                }
            }
            return true;
        }
    },

    obsede_echecs: {
        filterMoves(moves, fromRow, fromCol, piece, board) {
            const checkMoves = moves.filter(([nr, nc]) => moveGivesCheck(board, [fromRow, fromCol], [nr, nc]));
            if (checkMoves.length > 0) return checkMoves;
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            const anyCheck = allMoves.some(m => moveGivesCheck(board, m.from, m.to));
            if (anyCheck) {
                const myMoves = getValidMovesFn(row, col);
                return myMoves.some(([nr, nc]) => moveGivesCheck(board, [row, col], [nr, nc]));
            }
            return true;
        }
    },

    mon_tour: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            const required = PIECE_TYPE_ORDER[state.pieceTypeIndex[piece.color]];
            if (piece.type !== required) return [];
            return moves;
        },
        canSelect(row, col, piece, board, state) {
            const required = PIECE_TYPE_ORDER[state.pieceTypeIndex[piece.color]];
            return piece.type === required;
        }
    },

    '4_pions': {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (piece.type === 'pawn') {
                const activated = state.activatedPawnIds[piece.color].size;
                if (piece._pawnId === undefined && activated >= 4) return [];
            }
            return moves;
        }
    },

    roi_vaillant: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (piece.type === 'king' && state.moveCount >= 10) {
                const validRows = piece.color === 'white' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
                return moves.filter(([r]) => validRows.includes(r));
            }
            return moves;
        },
        checkLoss(color, board, state) {
            if (state.moveCount >= 10) {
                const kingPos = board.findKing(color);
                if (kingPos) {
                    const validRows = color === 'white' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
                    if (!validRows.includes(kingPos[0])) return true;
                }
            }
            return false;
        }
    },

    fous_flemmards: {
        filterMoves(moves, fromRow, fromCol, piece) {
            if (piece.type === 'bishop') {
                return moves.filter(([r]) => piece.color === 'white' ? r >= 4 : r <= 3);
            }
            return moves;
        }
    },

    activation_tour: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.moveCount < 15) {
                if (piece.type === 'rook') return [];
                if (piece.type === 'king') return moves.filter(([, c]) => c !== 2 && c !== 6);
            }
            return moves;
        }
    },

    limitation_vitesse: {
        filterMoves(moves, fromRow, fromCol) {
            return moves.filter(([r, c]) => Math.max(Math.abs(r - fromRow), Math.abs(c - fromCol)) <= 3);
        }
    },

    case_g4: {
        filterMoves(moves) {
            return moves.filter(([r, c]) => !(r === 4 && c === 6));
        },
        checkLoss(color, board, _state) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const p = board.getPiece(r, c);
                    if (p && p.color === color) {
                        const rawMoves = getMovesFn(board, r, c, p);
                        if (rawMoves.some(([mr, mc]) => mr === 4 && mc === 6)) return true;
                    }
                }
            }
            return false;
        }
    },

    mauvais_souvenir: {
        filterMoves(moves) {
            return moves.filter(([, c]) => c !== 2);
        }
    },

    diversite: {
        canSelect(row, col, piece, board, state) {
            return state.lastPieceType[piece.color] !== piece.type;
        }
    },

    commandant_bord: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.kingMovedLastTurns[piece.color] === 0) {
                return moves.filter(([r, c]) => !board.getPiece(r, c));
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            if (state.kingMovedLastTurns[piece.color] === 0) {
                const myMoves = getValidMovesFn(row, col);
                return myMoves.some(([r, c]) => !board.getPiece(r, c));
            }
            return true;
        }
    },

    chef_armees: {
        filterMoves(moves, fromRow, fromCol, piece, board) {
            const furthest = getFurthestPawnRow(board, piece.color);
            if (furthest !== null) {
                if (piece.color === 'white') return moves.filter(([r]) => r >= furthest);
                else return moves.filter(([r]) => r <= furthest);
            }
            return moves;
        }
    },

    adepte_captures: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.mustContinueCapture[piece.color]) {
                return moves.filter(([r, c]) => board.getPiece(r, c));
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            if (state.mustContinueCapture[piece.color]) {
                const myMoves = getValidMovesFn(row, col);
                return myMoves.some(([r, c]) => board.getPiece(r, c));
            }
            return true;
        }
    },

    rechargement: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.mustMoveBackward[piece.color]) {
                return moves.filter(([r]) => piece.color === 'white' ? r > fromRow : r < fromRow);
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            if (state.mustMoveBackward[piece.color]) {
                const myMoves = getValidMovesFn(row, col);
                return myMoves.some(([r]) => piece.color === 'white' ? r > row : r < row);
            }
            return true;
        },
        checkLoss(color, board, state, playableMoves) {
            if (state.mustMoveBackward[color] && playableMoves !== undefined && playableMoves.length === 0) {
                return true;
            }
            return false;
        }
    },

    rapidement_epuise: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            const key = `${fromRow}-${fromCol}`;
            if ((state.pieceMoveCount[key] || 0) >= 3) return [];
            return moves;
        }
    },

    lave_montante: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.lavaRow !== null) {
                if (fromRow === state.lavaRow) return [];
                return moves.filter(([r]) => r !== state.lavaRow);
            }
            return moves;
        }
    },

    refus_participation: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            const frozen = state.frozenPieceTypes[piece.color];
            if (frozen[piece.type] > 0) return [];
            return moves;
        }
    },

    alternance: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            const lastColor = state.lastLandingSquareColor?.[piece.color] ?? null;
            if (lastColor !== null) {
                return moves.filter(([r, c]) => (r + c) % 2 !== lastColor);
            }
            return moves;
        }
    },

    copycat: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.moveCount > 0 && state.lastOpponentMove) {
                const lastCol = state.lastOpponentMove.to[1];
                const queenSide = lastCol < 4;
                return moves.filter(([, c]) => (c < 4) === queenSide);
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            if (state.moveCount > 0 && state.lastOpponentMove) {
                const myMoves = getValidMovesFn(row, col);
                const lastCol = state.lastOpponentMove.to[1];
                const queenSide = lastCol < 4;
                return myMoves.some(([, c]) => (c < 4) === queenSide);
            }
            return true;
        }
    },

    copycat_master: {
        filterMoves(moves, fromRow, fromCol, piece, board, state) {
            if (state.moveCount > 0 && state.lastOpponentMove) {
                const lastCol = state.lastOpponentMove.to[1];
                return moves.filter(([, c]) => fromCol === lastCol || c === lastCol);
            }
            return moves;
        },
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            if (state.moveCount > 0 && state.lastOpponentMove) {
                const lastCol = state.lastOpponentMove.to[1];
                const myMoves = getValidMovesFn(row, col);
                return col === lastCol || myMoves.some(([, c]) => c === lastCol);
            }
            return true;
        }
    },

    cible_vue: {
        canSelect(row, col, piece, board, state, allMoves, getValidMovesFn) {
            if (state.targetSquare) {
                const myMoves = getValidMovesFn(row, col);
                return myMoves.some(([r, c]) => r === state.targetSquare[0] && c === state.targetSquare[1]);
            }
            return true;
        }
    },

    colonne_b: {
        checkLoss(color, board) {
            let hasOnB = false;
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (board.getPiece(r, 1)?.color === color) { hasOnB = true; break; }
            }
            return !hasOnB;
        }
    },

    impasse_mexicaine: {
        checkLoss(color, board) {
            const rooks = [];
            board.forEachPiece((p, r, c) => {
                if (p.type === 'rook' && p.color === color) rooks.push([r, c]);
            });
            if (rooks.length >= 2) {
                const [r1, c1] = rooks[0], [r2, c2] = rooks[1];
                if (r1 === r2) {
                    let clear = true;
                    for (let k = Math.min(c1, c2) + 1; k < Math.max(c1, c2); k++) {
                        if (board.getPiece(r1, k)) { clear = false; break; }
                    }
                    if (clear) return true;
                }
                if (c1 === c2) {
                    let clear = true;
                    for (let k = Math.min(r1, r2) + 1; k < Math.max(r1, r2); k++) {
                        if (board.getPiece(k, c1)) { clear = false; break; }
                    }
                    if (clear) return true;
                }
            }
            return false;
        }
    },

    loyaute: {
        checkLoss(color, board) {
            const kp = board.findKing(color);
            if (kp) {
                let adj = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = kp[0] + dr, nc = kp[1] + dc;
                        if (board.isInBounds(nr, nc) && board.getPiece(nr, nc)?.color === color) adj++;
                    }
                }
                if (adj < 3) return true;
            }
            return false;
        }
    }
};

let getMovesFn = null;
export function setGetMovesFn(fn) { getMovesFn = fn; }

export function assignChallenges(whiteDiff, blackDiff) {
    const whitePool = [...CHALLENGES[whiteDiff]];
    const blackPool = [...CHALLENGES[blackDiff]];
    const wIdx = Math.floor(Math.random() * whitePool.length);
    let bIdx = Math.floor(Math.random() * blackPool.length);
    while (blackPool[bIdx]?.id === whitePool[wIdx]?.id && blackPool.length > 1) {
        bIdx = (bIdx + 1) % blackPool.length;
    }
    return {
        whiteChallenge: { ...whitePool[wIdx], difficulty: whiteDiff },
        blackChallenge: { ...blackPool[bIdx], difficulty: blackDiff },
        whiteDifficulty: whiteDiff,
        blackDifficulty: blackDiff
    };
}
