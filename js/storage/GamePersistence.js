const STORAGE_KEY = 'drawback_chess_state';

export function saveGameState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Impossible de sauvegarder la partie:', e);
    }
}

export function loadGameState() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('Impossible de charger la partie:', e);
        return null;
    }
}

export function clearGameState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Impossible de supprimer la sauvegarde:', e);
    }
}

export function hasSavedGame() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (e) {
        return false;
    }
}
