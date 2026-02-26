export class ScreenManager {
    constructor() {
        this.screens = {
            mode: document.getElementById('mode-screen'),
            setup: document.getElementById('setup-screen'),
            lobby: document.getElementById('online-lobby'),
            game: document.getElementById('game-screen'),
            victory: document.getElementById('victory-screen')
        };
    }

    show(screenName) {
        for (const [, el] of Object.entries(this.screens)) {
            if (el) el.style.display = 'none';
        }
        const target = this.screens[screenName];
        if (target) target.style.display = screenName === 'game' ? 'flex' : 'block';
    }

    updateChallengeDisplay(matchState, onlineMode, myRole, currentPlayer) {
        const wc = matchState.whiteChallenge;
        const bc = matchState.blackChallenge;
        const panel = document.getElementById('challenges-panel');
        const whiteInfo = document.getElementById('white-challenge-info');
        const blackInfo = document.getElementById('black-challenge-info');

        whiteInfo.innerHTML = wc ? `<strong>${wc.name}</strong><br><small>${wc.desc}</small>` : '-';
        blackInfo.innerHTML = bc ? `<strong>${bc.name}</strong><br><small>${bc.desc}</small>` : '-';

        const wBox = panel.querySelector('.white-challenge');
        const bBox = panel.querySelector('.black-challenge');

        if (onlineMode && myRole) {
            wBox.style.display = myRole === 'white' ? 'block' : 'none';
            bBox.style.display = myRole === 'black' ? 'block' : 'none';
        } else {
            wBox.style.display = '';
            bBox.style.display = '';
            wBox.classList.toggle('challenge-active', currentPlayer === 'white');
            bBox.classList.toggle('challenge-active', currentPlayer === 'black');
        }
    }

    updateChallengeAlerts(challengeState) {
        const el = document.getElementById('challenge-alerts');
        const msgs = [];
        if (challengeState.targetSquare) {
            const col = 'abcdefgh'[challengeState.targetSquare[1]];
            const row = 8 - challengeState.targetSquare[0];
            msgs.push(`🎯 Cible: ${col}${row}`);
        }
        if (challengeState.lavaRow !== null) {
            msgs.push(`🌋 Lave: rangée ${8 - challengeState.lavaRow}`);
        }
        el.textContent = msgs.length ? msgs.join(' | ') : '';
    }

    updateCurrentPlayer(currentPlayer, onlineMode, myRole) {
        let text = currentPlayer === 'white' ? 'Blanc' : 'Noir';
        if (onlineMode && myRole) {
            text += (currentPlayer === myRole) ? ' (à vous)' : ' (adversaire)';
        }
        document.getElementById('current-player').textContent = text;
    }

    setGameStatus(message) {
        const el = document.getElementById('game-status');
        if (el) el.textContent = message;
    }

    getGameStatus() {
        return document.getElementById('game-status')?.textContent || '';
    }

    showVictoryScreen(displayWinner, matchState, victoryReason) {
        const isWhite = displayWinner === 'Blanc';
        const challenge = isWhite ? matchState.whiteChallenge : matchState.blackChallenge;
        const wonWithImpossible = challenge?.difficulty === 'impossible';

        document.getElementById('victory-title').textContent = wonWithImpossible ? '🏆 VICTOIRE DU MATCH ! 🏆' : 'Partie terminée';
        document.getElementById('victory-message').textContent = `${displayWinner} gagne!` + (wonWithImpossible ? ' Avec un défi IMPOSSIBLE ! ' : '');

        const reasonEl = document.getElementById('victory-reason');
        if (victoryReason) {
            reasonEl.textContent = victoryReason;
            reasonEl.style.display = '';
        } else {
            reasonEl.textContent = '';
            reasonEl.style.display = 'none';
        }

        document.getElementById('match-status').textContent = wonWithImpossible ? 'Match gagné !' : 'Prochaine partie : le vainqueur monte en difficulté.';
        this.show('victory');
    }

    showPromotionModal() {
        document.getElementById('promotion-modal').style.display = 'flex';
    }

    hidePromotionModal() {
        document.getElementById('promotion-modal').style.display = 'none';
    }
}
