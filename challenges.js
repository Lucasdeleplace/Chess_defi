// Système de défis Drawback Chess
const DIFFICULTY_ORDER = ['facile', 'moyen', 'difficile', 'impossible'];

const CHALLENGES = {
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

// Valeurs des pièces pour "Les yeux plus gros que le ventre"
const PIECE_VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
