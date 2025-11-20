/**
 * main.js
 * Entry Point. Attaches listeners and starts the game.
 */

 (function() {
    const Core = LudoGame.Core;
    const UI = LudoGame.UI;
    const State = LudoGame.State;
    const Config = LudoGame.Config;
    const Utils = LudoGame.Utils;

    // --- DOM Refs for Listeners ---
    const boardGameBody = document.body;
    const modeToggleBtn = document.getElementById('mode-toggle');
    const modeDisplay = document.getElementById('mode-display');
    const resetBtn = document.getElementById('reset-btn');
    const playerCountSelect = document.getElementById('player-count-select');
    
    const popupMoveBtn = document.getElementById('popup-move');
    const popupSelectBtn = document.getElementById('popup-select-instead');
    const popupCancelBtn = document.getElementById('popup-cancel');
    const repeatTurnBtn = document.getElementById('repeat-turn-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const prevTurnBtn = document.getElementById('prev-turn-btn');
    const nextTurnBtn = document.getElementById('next-turn-btn');

    // --- LISTENERS ---

    // 1. Player Count Change
    if (playerCountSelect) {
        playerCountSelect.addEventListener('change', () => {
            // Trigger reset to apply new player count
            document.getElementById('reset-btn').click();
        });
    }

    // 2. Toggle Game Mode
    modeToggleBtn.addEventListener('click', () => {
        State.isPairMode = !State.isPairMode;
        
        // Update Text
        UI.elements.modeDisplay.innerText = State.isPairMode ? 'Team Mode' : 'Solo Mode';
        
        // Handle Player Count Restrictions
        if (State.isPairMode) {
            // Team Mode: Force 4 players and lock dropdown
            playerCountSelect.value = "4";
            playerCountSelect.disabled = true;
        } else {
            // Solo Mode: Unlock dropdown
            playerCountSelect.disabled = false;
        }

        // Trigger reset to apply the mode change immediately
        document.getElementById('reset-btn').click();
    });

    // 3. Reset Button
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (!confirm("Are you sure you want to reset? All current progress will be lost.")) {
            return;
        }

        console.log("Reset");
        LudoGame.Audio.trigger('reset');
        
        // Core Reset
        LudoGame.State.reset();
        LudoGame.UI.renderBoard();
        LudoGame.UI.updateTurn();
        LudoGame.Core.clearSelection();
        LudoGame.UI.hidePopup();
        LudoGame.UI.hidePostMove();
        
        // Unlock Controls
        document.getElementById('mode-toggle').disabled = false;
        
        // Only unlock player selector if we are in Solo Mode
        if (playerCountSelect) {
            playerCountSelect.disabled = State.isPairMode;
        }
        
        LudoGame.UI.updateWinners();
    });

    // --- POPUP & MODAL LISTENERS ---
    
    document.getElementById('popup-move').addEventListener('click', () => {
        if (State.selectedPawnInfo && State.tempDestinationId) {
            const { fromContainerId, pawn } = State.selectedPawnInfo;
            Core.clearSelection();
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

    document.getElementById('prev-turn-btn').addEventListener('click', () => Core.manualTurnChange(-1));
    document.getElementById('next-turn-btn').addEventListener('click', () => Core.manualTurnChange(1));

    // --- MAIN BOARD CLICK ---
    boardGameBody.addEventListener('click', (event) => {
        if (State.isGameOver || State.isAnimating) {
            return;
        }
        
        const clickedContainer = event.target.closest('.pawn-container');
        if (event.target.closest('.dice-roller') || event.target.closest('#popup-menu')) return;
        if (!clickedContainer) return;

        const containerId = clickedContainer.id;

        if (!State.selectedPawnInfo) {
            UI.hidePopup();
            const teamToPlay = Utils.getTeamToPlay();
            const hasPawn = State.boardState[containerId].some(p => p.team === teamToPlay);
            if(hasPawn) Core.selectCell(clickedContainer);
        } else {
            const fromId = State.selectedPawnInfo.fromContainerId;
            if (fromId === containerId) {
                Core.clearSelection();
                UI.hidePopup();
                return;
            }
            
            if (State.tempDestinationId) {
                const old = document.getElementById(State.tempDestinationId);
                if(old) old.classList.remove('target-cell');
            }

            const team = State.selectedPawnInfo.pawn.team;
            const path = Config.TEAM_PATHS[team];
            const start = path.indexOf(fromId);
            const end = path.indexOf(containerId);
            const steps = end - start;

            if (end === -1 || steps <= 0 || steps > 12) return;

            State.tempDestinationId = containerId;
            
            let showSelect = false;
            if (containerId !== 'off-board-area') {
                const teamToPlay = Utils.getTeamToPlay();
                showSelect = State.boardState[containerId].some(p => p.team === teamToPlay);
            }
            UI.showPopup(clickedContainer, showSelect);
        }
    });

    // --- INIT ---
    LudoGame.UI.buildGrid();
    LudoGame.State.reset();
    LudoGame.UI.renderBoard();
    LudoGame.UI.updateTurn();

})();