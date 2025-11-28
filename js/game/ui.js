/**
 * ui.js
 * -------------------------------------------------------------------------
 * This module handles all Direct DOM Manipulation and Visuals.
 * It is responsible for:
 * 1. Creating the HTML grid for the board.
 * 2. Rendering pawn stacks based on the game state.
 * 3. Handling visual updates like Turn Indicators and Winner Lists.
 * 4. Managing CSS classes for Highlighting (paths) and Selection.
 * 5. Controlling the visibility of Popups and Modals.
 * 6. Executing the "Floating Pawn" animation.
 * -------------------------------------------------------------------------
 */

// Ensure the global namespace exists
window.LudoGame = window.LudoGame || {};

(function () {

    // =========================================================================
    // 1. CACHE DOM ELEMENTS
    // We look these up once to improve performance and keep code clean.
    // =========================================================================
    const els = {
        // The main board container
        board: document.getElementById('game-board'),
        // Wrapper used for calculating relative coordinates for animations/popups
        wrapper: document.querySelector('.full-game-wrapper'),

        // Sidebar panels
        offBoard: document.getElementById('off-board-area'),
        turnDisplay: document.getElementById('turn-display'),
        winnersList: document.getElementById('winners-list'),
        modeDisplay: document.getElementById('mode-display'),
        modeBtn: document.getElementById('mode-toggle'),

        // Move Confirmation Popup
        popup: document.getElementById('popup-menu'),
        popupMoveBtn: document.getElementById('popup-move'),
        selectBtn: document.getElementById('popup-select-instead'),

        // End Turn / Repeat Turn Modal
        modal: document.getElementById('modal-overlay'),
        postPopup: document.getElementById('post-move-popup')
    };

    LudoGame.UI = {
        // Expose elements object if other modules need direct access
        elements: els,

        // =====================================================================
        // 2. INITIALIZATION & GRID BUILDING
        // =====================================================================

        /** * Builds the 7x7 grid of cells.
         * This runs only once when the game starts.
         * It adds specific CSS classes for the "Pyramid Layers" and Home Bases.
         */
        buildGrid: function () {
            const {
                ROWS,
                COLS,
                HOME_BASE_MAP
            } = LudoGame.Config;

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = document.createElement('div');

                    // Base classes for styling and click detection
                    cell.classList.add('grid-cell', 'pawn-container');

                    // Assign ID: "cell-0-0", "cell-0-1", etc.
                    cell.id = `cell-${r}-${c}`;

                    // --- Layer Logic (Visual Depth) ---
                    // Calculates distance from center (3,3) to determine the ring level
                    const dist = LudoGame.Utils.distFromCenter(r, c);
                    if (dist === 3) cell.classList.add('layer-outer');
                    else if (dist === 2) cell.classList.add('layer-middle');
                    else if (dist === 1) cell.classList.add('layer-inner');
                    else if (dist === 0) cell.classList.add('layer-center');

                    els.board.appendChild(cell);

                    // --- Home Base Coloring ---
                    if (HOME_BASE_MAP['red'] === cell.id) cell.classList.add('home-red');
                    if (HOME_BASE_MAP['blue'] === cell.id) cell.classList.add('home-blue');
                    if (HOME_BASE_MAP['green'] === cell.id) cell.classList.add('home-green');
                    if (HOME_BASE_MAP['yellow'] === cell.id) cell.classList.add('home-yellow');
                }
            }
        },

        // =====================================================================
        // 3. PAWN RENDERING
        // =====================================================================

        /** * Internal Helper: Creates the HTML for a single pawn stack.
         * @param {string} team - The color of the pawn ('red', 'blue', etc.)
         * @param {number} count - The number displayed on the pawn.
         * @returns {HTMLElement} The div element representing the pawn.
         */
        createPawn: function (team, count) {
            const stack = document.createElement('div');
            stack.classList.add('pawn-stack', `pawn-stack-${team}`);
            stack.dataset.team = team; // Used by click listeners to identify team

            const counter = document.createElement('div');
            counter.classList.add('pawn-counter');
            counter.innerText = count;

            stack.appendChild(counter);
            return stack;
        },

        /** * Renders the contents of a specific container (a Cell or the Off-Board area).
         * 1. Clears the container.
         * 2. Reads the current state.
         * 3. Creates new pawn elements for every team present.
         * * @param {string} id - The ID of the container to update.
         */
        renderContainer: function (id) {
            const container = document.getElementById(id);
            if (!container) return;

            const pawns = LudoGame.State.boardState[id];
            const selected = LudoGame.State.selectedPawnInfo;

            // Clean up previous pawns
            if (id === 'off-board-area') {
                // For off-board, keep the <h3> header, remove only pawns
                container.querySelectorAll('.pawn-stack').forEach(el => el.remove());
            } else {
                // For grid cells, wipe everything
                container.innerHTML = '';
            }

            // Group pawns by team (e.g., {red: 2, blue: 1})
            const groups = {};
            if (pawns) {
                pawns.forEach(p => {
                    if (!groups[p.team]) groups[p.team] = 0;
                    groups[p.team]++;
                });
            }

            // Draw the new stacks
            for (const team in groups) {
                const el = this.createPawn(team, groups[team]);
                container.appendChild(el);

                // If this specific stack is selected, add the "Shimmer" effect
                if (selected && selected.fromContainerId === id && selected.pawn.team === team) {
                    el.classList.add('selected-pawn');
                }
            }
        },

        /** * Loops through the entire board state and re-renders every cell.
         * Useful for full resets or major state changes.
         */
        renderBoard: function () {
            for (const id in LudoGame.State.boardState) {
                this.renderContainer(id);
            }
        },

        // === NEW: RENDER MOVE BANK ===
        renderMoveBank: function() {
            const bankList = document.getElementById('move-bank-list');
            const bankDisplay = document.getElementById('move-bank-display');
            
            if (!bankList || !bankDisplay) return; // Safety check

            bankList.innerHTML = ''; // Clear list
            
            const bank = LudoGame.State.moveBank;
            const selectedIdx = LudoGame.State.selectedBankIndex;

            bank.forEach((val, index) => {
                const btn = document.createElement('button');
                btn.className = 'bank-item';
                btn.innerText = val;
                
                if (index === selectedIdx) btn.classList.add('selected');
                
                // We will add the click listener in the next step (Core logic)
                
                bankList.appendChild(btn);
            });
            
            // Show/Hide container
            if (bank.length > 0) {
                bankDisplay.classList.remove('hidden');
            } else {
                bankDisplay.classList.add('hidden');
            }
        },
        
        updateRollButtonState: function() {
            const btn = document.getElementById('roll-button');
            if(!btn) return;
            // Simple check for now, full logic coming in Step 2
            const canRoll = LudoGame.State.pendingRolls > 0 && !LudoGame.State.isGameOver;
            btn.disabled = !canRoll;
            btn.innerText = canRoll ? `Roll (${LudoGame.State.pendingRolls})` : "Roll";
        },

        // =====================================================================
        // 4. INFO DISPLAYS (Turn & Winners)
        // =====================================================================

        /** * Updates the "Current Turn" box and the board's background glow.
         */
        updateTurn: function () {
            const turn = LudoGame.State.currentTurn;

            // Update Text
            els.turnDisplay.innerText = turn.toUpperCase();
            els.turnDisplay.style.backgroundColor = LudoGame.Config.TEAM_COLORS[turn];

            // Update Board Background Glow
            els.board.classList.remove('board-turn-red', 'board-turn-blue', 'board-turn-green', 'board-turn-yellow');
            els.board.classList.add(`board-turn-${turn}`);
        },

        /** * Updates the "Winners" list in the sidebar.
         * Handles both Solo Mode (individual teams) and Team Mode (pairs).
         */
        updateWinners: function () {
            els.winnersList.innerHTML = ''; // Clear list

            const list = LudoGame.State.isPairMode ? LudoGame.State.pairWinnerOrder : LudoGame.State.winnersList;

            list.forEach((name, i) => {
                const li = document.createElement('li');
                li.innerText = `${i + 1}: ${name.toUpperCase()}`;
                els.winnersList.appendChild(li);
            });
        },

        // =====================================================================
        // 5. PATH HIGHLIGHTING
        // =====================================================================

        /** * Lights up the path for the currently selected pawn.
         * Limits the highlight to 12 steps to avoid visual clutter.
         * * @param {string} team - The team color of the selected pawn.
         * @param {string} startId - The cell ID where the pawn currently is.
         */
        highlightPath: function (team, startId) {
            const path = LudoGame.Config.TEAM_PATHS[team];
            const idx = path.indexOf(startId);
            if (idx === -1) return;

            // Grab the next 12 cells in the path
            const nextSteps = path.slice(idx + 1, idx + 1 + 12);

            nextSteps.forEach((cellId, i) => {
                const cell = document.getElementById(cellId);
                if (cell) {
                    // Add the highlight class
                    cell.classList.add('path-highlight', `path-highlight-${team}`);
                    // Stagger the animation delay for a "wave" effect (0.1s per step)
                    cell.style.animationDelay = `${i * 0.1}s`;
                }
            });
        },

        /** * Removes all highlighting from the board.
         */
        clearHighlights: function () {
            const lit = document.querySelectorAll('.path-highlight');
            lit.forEach(el => {
                // Regex removes any class starting with "path-highlight"
                el.className = el.className.replace(/path-highlight.*/, '').trim();
                el.style.animationDelay = '0s';
            });
        },

        // =====================================================================
        // 6. POPUPS & MODALS
        // =====================================================================

        /** * Shows the "Move Here / Select Instead / Cancel" popup.
         * Positions it next to the clicked cell.
         */
        showPopup: function (cell, showSelect) {
            // Calculate position relative to the game wrapper
            const r1 = cell.getBoundingClientRect();
            const r2 = els.wrapper.getBoundingClientRect();

            els.popup.style.top = `${r1.top - r2.top}px`;
            els.popup.style.left = `${r1.left - r2.left + r1.width + 5}px`;

            // Show "Select this pawn" button only if applicable
            els.selectBtn.classList.toggle('hidden', !showSelect);

            els.popup.classList.remove('hidden');

            // Add orange target shimmer to the destination cell
            cell.classList.add('target-cell');
        },

        /** * Hides the move popup and removes the destination highlight.
         */
        hidePopup: function () {
            els.popup.classList.add('hidden');

            // Remove shimmer from temp destination if it exists
            const tempId = LudoGame.State.tempDestinationId;
            if (tempId) {
                const cell = document.getElementById(tempId);
                if (cell) cell.classList.remove('target-cell');
            }
        },

        /** Shows the "Repeat Turn / End Turn" modal overlay */
        showPostMove: function () {
            els.modal.classList.remove('hidden');
            els.postPopup.classList.remove('hidden');
        },

        /** Hides the "Repeat Turn / End Turn" modal overlay */
        hidePostMove: function () {
            els.modal.classList.add('hidden');
            els.postPopup.classList.add('hidden');
        },

        // =====================================================================
        // 7. ANIMATION LOGIC
        // =====================================================================

        /** * Helper: Calculates the exact X/Y pixel coordinates for a pawn 
         * to be centered inside a specific DOM element.
         */
        getCoords: function (el) {
            const r1 = els.wrapper.getBoundingClientRect();
            const r2 = el.getBoundingClientRect();
            return {
                // Center calculations based on pawn size (26px -> 13px offset)
                x: (r2.left - r1.left) + (r2.width / 2) - 13,
                y: (r2.top - r1.top) + (r2.height / 2) - 13
            };
        },

        /** * ANIMATION: Creates a "Floating Pawn" and slides it step-by-step
         * along the path.
         * * @param {string} team - Color of the pawn
         * @param {string} startId - Starting cell ID
         * @param {Array} steps - Array of cell IDs to travel through
         * @returns {Promise} Resolves when animation completes
         */
        animateMove: async function (team, startId, steps) {
            // 1. Setup Start Position
            const startCell = document.getElementById(startId);
            const startXY = this.getCoords(startCell);

            // 2. Create Floating Visual
            const floater = document.createElement('div');
            floater.classList.add('floating-pawn', `pawn-stack-${team}`);
            floater.style.left = `${startXY.x}px`;
            floater.style.top = `${startXY.y}px`;

            const txt = document.createElement('div');
            txt.classList.add('pawn-counter');
            txt.innerText = "1"; // Always animating 1 pawn
            floater.appendChild(txt);

            els.wrapper.appendChild(floater);
            floater.offsetHeight; // Force browser reflow to ensure transition applies

            // 3. Step Loop
            for (const stepId of steps) {
                const target = document.getElementById(stepId);
                const targetXY = this.getCoords(target);

                LudoGame.Audio.trigger('move'); // Sound effect per step

                // Apply new coordinates (CSS transition handles smoothing)
                floater.style.left = `${targetXY.x}px`;
                floater.style.top = `${targetXY.y}px`;

                // Wait for CSS transition (250ms)
                await new Promise(r => setTimeout(r, 250));
            }

            // 4. Cleanup
            floater.remove();
        }
    };
})();