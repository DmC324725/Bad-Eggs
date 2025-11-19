/**
 * ui.js
 * Handles all visual aspects: Rendering the board, popups, highlighting, and animations.
 */

window.LudoGame = window.LudoGame || {};

(function () {
    // Cache DOM Elements
    const els = {
        board: document.getElementById('game-board'),
        wrapper: document.querySelector('.full-game-wrapper'),
        offBoard: document.getElementById('off-board-area'),
        turnDisplay: document.getElementById('turn-display'),
        winnersList: document.getElementById('winners-list'),
        popup: document.getElementById('popup-menu'),
        selectBtn: document.getElementById('popup-select-instead'),
        modal: document.getElementById('modal-overlay'),
        postPopup: document.getElementById('post-move-popup'),
        modeDisplay: document.getElementById('mode-display'),
        modeBtn: document.getElementById('mode-toggle'),
        popupMoveBtn: document.getElementById('popup-move')
    };

    LudoGame.UI = {
        // Expose elements
        elements: els,

        /** Builds the initial grid HTML */
        buildGrid: function () {
            const {
                ROWS,
                COLS,
                HOME_BASE_MAP
            } = LudoGame.Config;

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = document.createElement('div');
                    cell.classList.add('grid-cell', 'pawn-container');
                    cell.id = `cell-${r}-${c}`;

                    // Layer styling
                    const dist = LudoGame.Utils.distFromCenter(r, c);
                    if (dist === 3) cell.classList.add('layer-outer');
                    else if (dist === 2) cell.classList.add('layer-middle');
                    else if (dist === 1) cell.classList.add('layer-inner');
                    else if (dist === 0) cell.classList.add('layer-center');

                    els.board.appendChild(cell);

                    // Home base styling
                    if (HOME_BASE_MAP['red'] === cell.id) cell.classList.add('home-red');
                    if (HOME_BASE_MAP['blue'] === cell.id) cell.classList.add('home-blue');
                    if (HOME_BASE_MAP['green'] === cell.id) cell.classList.add('home-green');
                    if (HOME_BASE_MAP['yellow'] === cell.id) cell.classList.add('home-yellow');
                }
            }
        },

        /** Helper to create visual pawn element */
        createPawn: function (team, count) {
            const stack = document.createElement('div');
            stack.classList.add('pawn-stack', `pawn-stack-${team}`);
            stack.dataset.team = team;
            const counter = document.createElement('div');
            counter.classList.add('pawn-counter');
            counter.innerText = count;
            stack.appendChild(counter);
            return stack;
        },

        /** Renders specific container based on state */
        renderContainer: function (id) {
            const container = document.getElementById(id);
            if (!container) return;

            const pawns = LudoGame.State.boardState[id];
            const selected = LudoGame.State.selectedPawnInfo;

            // Clear existing
            if (id === 'off-board-area') {
                container.querySelectorAll('.pawn-stack').forEach(el => el.remove());
            } else {
                container.innerHTML = '';
            }

            // Group by team
            const groups = {};
            if (pawns) {
                pawns.forEach(p => {
                    if (!groups[p.team]) groups[p.team] = 0;
                    groups[p.team]++;
                });
            }

            // Create new elements
            for (const team in groups) {
                const el = this.createPawn(team, groups[team]);
                container.appendChild(el);

                // Add selection shimmer
                if (selected && selected.fromContainerId === id && selected.pawn.team === team) {
                    el.classList.add('selected-pawn');
                }
            }
        },

        /** Full re-render */
        renderBoard: function () {
            for (const id in LudoGame.State.boardState) {
                this.renderContainer(id);
            }
        },

        /** Update Text and Colors for Turn */
        updateTurn: function () {
            const turn = LudoGame.State.currentTurn;
            els.turnDisplay.innerText = turn.toUpperCase();
            els.turnDisplay.style.backgroundColor = LudoGame.Config.TEAM_COLORS[turn];

            els.board.classList.remove('board-turn-red', 'board-turn-blue', 'board-turn-green', 'board-turn-yellow');
            els.board.classList.add(`board-turn-${turn}`);
        },

        /** Update Winner List */
        updateWinners: function () {
            els.winnersList.innerHTML = '';
            const list = LudoGame.State.isPairMode ? LudoGame.State.pairWinnerOrder : LudoGame.State.winnersList;

            list.forEach((name, i) => {
                const li = document.createElement('li');
                li.innerText = `${i + 1}: ${name.toUpperCase()}`;
                els.winnersList.appendChild(li);
            });
        },

        /** Path Highlighting */
        highlightPath: function (team, startId) {
            const path = LudoGame.Config.TEAM_PATHS[team];
            const idx = path.indexOf(startId);
            if (idx === -1) return;

            // Limit to 12 steps
            const nextSteps = path.slice(idx + 1, idx + 1 + 12);

            nextSteps.forEach((cellId, i) => {
                const cell = document.getElementById(cellId);
                if (cell) {
                    cell.classList.add('path-highlight', `path-highlight-${team}`);
                    cell.style.animationDelay = `${i * 0.1}s`;
                }
            });
        },

        clearHighlights: function () {
            const lit = document.querySelectorAll('.path-highlight');
            lit.forEach(el => {
                el.className = el.className.replace(/path-highlight.*/, '').trim(); // Remove all highlight classes
                el.style.animationDelay = '0s';
            });
        },

        /** Visual Popups */
        showPopup: function (cell, showSelect) {
            const r1 = cell.getBoundingClientRect();
            const r2 = els.wrapper.getBoundingClientRect();

            els.popup.style.top = `${r1.top - r2.top}px`;
            els.popup.style.left = `${r1.left - r2.left + r1.width + 5}px`;

            els.selectBtn.classList.toggle('hidden', !showSelect);
            els.popup.classList.remove('hidden');
            cell.classList.add('target-cell');
        },

        hidePopup: function () {
            els.popup.classList.add('hidden');
            const tempId = LudoGame.State.tempDestinationId;
            if (tempId) {
                const cell = document.getElementById(tempId);
                if (cell) cell.classList.remove('target-cell');
            }
        },

        showPostMove: function () {
            els.modal.classList.remove('hidden');
            els.postPopup.classList.remove('hidden');
        },

        hidePostMove: function () {
            els.modal.classList.add('hidden');
            els.postPopup.classList.add('hidden');
        },

        /** Animation Logic */
        getCoords: function (el) {
            const r1 = els.wrapper.getBoundingClientRect();
            const r2 = el.getBoundingClientRect();
            // Center the 26px pawn
            return {
                x: (r2.left - r1.left) + (r2.width / 2) - 13,
                y: (r2.top - r1.top) + (r2.height / 2) - 13
            };
        },

        animateMove: async function (team, startId, steps) {
            const startCell = document.getElementById(startId);
            const startXY = this.getCoords(startCell);

            const floater = document.createElement('div');
            floater.classList.add('floating-pawn', `pawn-stack-${team}`);
            floater.style.left = `${startXY.x}px`;
            floater.style.top = `${startXY.y}px`;

            const txt = document.createElement('div');
            txt.classList.add('pawn-counter');
            txt.innerText = "1";
            floater.appendChild(txt);

            els.wrapper.appendChild(floater);
            floater.offsetHeight; // force reflow

            for (const stepId of steps) {
                const target = document.getElementById(stepId);
                const targetXY = this.getCoords(target);

                LudoGame.Audio.trigger('move');

                floater.style.left = `${targetXY.x}px`;
                floater.style.top = `${targetXY.y}px`;

                await new Promise(r => setTimeout(r, 250));
            }

            floater.remove();
        }
    };
})();