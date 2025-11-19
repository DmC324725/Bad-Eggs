/**
 * main.js
 * Entry Point. Attaches listeners and starts the game.
 */

(function () {
    const Core = LudoGame.Core;
    const UI = LudoGame.UI;
    const State = LudoGame.State;
    const Config = LudoGame.Config;
    const Utils = LudoGame.Utils;

    // --- CLICK LISTENER (Delegation) ---
    document.body.addEventListener('click', (event) => {
        // Blocker check
        if (State.isGameOver || State.isAnimating || !UI.elements.postPopup.classList.contains('hidden')) return;

        const container = event.target.closest('.pawn-container');
        if (event.target.closest('.dice-roller') || event.target.closest('#popup-menu')) return;
        if (!container) return;

        const id = container.id;

        // Case A: Select
        if (!State.selectedPawnInfo) {
            UI.hidePopup();
            // Check if valid team
            const teamToPlay = Utils.getTeamToPlay();
            const hasPawn = State.boardState[id].some(p => p.team === teamToPlay);
            if (hasPawn) Core.selectCell(container);
        }
        // Case B: Move
        else {
            const fromId = State.selectedPawnInfo.fromContainerId;

            // Deselect?
            if (fromId === id) {
                Core.clearSelection();
                UI.hidePopup();
                return;
            }

            // Remove old target highlight?
            if (State.tempDestinationId) {
                const old = document.getElementById(State.tempDestinationId);
                if (old) old.classList.remove('target-cell');
            }

            // Validate Move
            const team = State.selectedPawnInfo.pawn.team;
            const path = Config.TEAM_PATHS[team];
            const start = path.indexOf(fromId);
            const end = path.indexOf(id);
            const steps = end - start;

            if (end === -1 || steps <= 0 || steps > 12) return; // Invalid

            State.tempDestinationId = id;

            // Show popup
            let showSelect = false;
            if (id !== 'off-board-area') {
                const teamToPlay = Utils.getTeamToPlay();
                showSelect = State.boardState[id].some(p => p.team === teamToPlay);
            }
            UI.showPopup(container, showSelect);
        }
    });

    // --- BUTTONS ---
    UI.elements.modeBtn.addEventListener('click', () => {
        State.isPairMode = !State.isPairMode;
        UI.elements.modeDisplay.innerText = State.isPairMode ? 'Team Mode' : 'Solo Mode';
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        console.log("Reset");
        LudoGame.Audio.trigger('reset');
        State.reset();
        UI.renderBoard();
        UI.updateTurn();
        Core.clearSelection();
        UI.hidePopup();
        UI.hidePostMove();
        UI.elements.modeBtn.disabled = false;
        UI.updateWinners();
    });

    // Popup
    document.getElementById('popup-move').addEventListener('click', () => {
        if (State.selectedPawnInfo && State.tempDestinationId) {
            const {
                fromContainerId,
                pawn
            } = State.selectedPawnInfo;
            Core.clearSelection(); // Clear highlight before move
            UI.hidePopup();
            Core.performMove(fromContainerId, State.tempDestinationId, pawn);
        }
    });

    document.getElementById('popup-select-instead').addEventListener('click', () => {
        if (State.tempDestinationId) {
            const newId = State.tempDestinationId;
            UI.hidePopup();
            Core.clearSelection();
            const cell = document.getElementById(newId);
            Core.selectCell(cell);
        }
    });

    document.getElementById('popup-cancel').addEventListener('click', UI.hidePopup);

    // Modal
    document.getElementById('repeat-turn-btn').addEventListener('click', () => {
        UI.hidePostMove();
        console.log("Turn Repeated");
    });
    document.getElementById('end-turn-btn').addEventListener('click', () => {
        UI.hidePostMove();
        Core.advanceTurn();
    });

    // Stepper
    document.getElementById('prev-turn-btn').addEventListener('click', () => Core.manualTurnChange(-1));
    document.getElementById('next-turn-btn').addEventListener('click', () => Core.manualTurnChange(1));

    // --- BOOTSTRAP ---
    UI.buildGrid();
    State.reset();
    UI.renderBoard();
    UI.updateTurn();

})();