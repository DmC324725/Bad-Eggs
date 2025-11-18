// This is an IIFE (Immediately Invoked Function Expression).
// It creates a private "scope" for the board game, so its
// variables won't conflict with the dice roller's.
(function() {
    
    // --- 1. GET DOM ELEMENTS ---
    const board = document.getElementById('game-board');
    const positionReferenceContainer = document.querySelector('.full-game-wrapper');
    const boardGameBody = document.body; // Listen on <body> to catch all clicks
    
    const offBoardArea = document.getElementById('off-board-area');
    const modeToggleBtn = document.getElementById('mode-toggle');
    const modeDisplay = document.getElementById('mode-display');
    const turnDisplay = document.getElementById('turn-display');
    const popupMenu = document.getElementById('popup-menu');
    const popupMoveBtn = document.getElementById('popup-move');
    const popupSelectBtn = document.getElementById('popup-select-instead');
    const popupCancelBtn = document.getElementById('popup-cancel');
    const modalOverlay = document.getElementById('modal-overlay');
    const postMovePopup = document.getElementById('post-move-popup');
    const repeatTurnBtn = document.getElementById('repeat-turn-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const resetBtn = document.getElementById('reset-btn');
    const winnersListEl = document.getElementById('winners-list');

    // --- 2. GAME RULES & CONSTANTS ---
    const homeBaseMap = { 'red': 'cell-0-3', 'blue': 'cell-3-0', 'green': 'cell-6-3', 'yellow': 'cell-3-6' };
    const specialBlocks = [ 'cell-0-3', 'cell-3-0', 'cell-6-3', 'cell-3-6', 'cell-3-3' ];
    const turnOrder = ['red', 'blue', 'green', 'yellow'];
    const teamColors = { 'red': '#e53935', 'blue': '#1e88e5', 'green': '#43a047', 'yellow': '#fdd835' };
    const rows = 7;
    const cols = 7;

    // --- 3. GAME STATE VARIABLES ---
    // These variables track the live state of the game.
    let isPairMode = false;         // 'Solo Mode' or 'Team Mode'
    let selectedPawnInfo = null;    // Stores the currently selected pawn: { fromContainerId, pawn: {...} }
    let globalMoveCounter = 0;      // Used for pawn 'arrival' time to track FIFO
    let boardState = {};            // The "source of truth" object that holds all pawn data
    let turnIndex = 0;              // 0=red, 1=blue, 2=green, 3=yellow
    let currentTurn = turnOrder[turnIndex]; // 'red'
    let tempDestinationId = null;   // Temporarily holds the cell ID a user wants to move to
    let finishedTeams = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
    let teamsToSkip = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
    let winnersList = [];           // For solo mode
    let pairWinnerOrder = [];       // For pair mode
    let isGameOver = false;         // Locks the board when the game ends
    
    // --- 4. INITIALIZATION FUNCTIONS ---
    
    /** Creates the 49 (7x7) grid cells and adds them to the board */
    function buildGridCells() { 
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell', 'pawn-container');
                cell.id = `cell-${r}-${c}`;
                board.appendChild(cell);
                // Add home/special colors
                if (homeBaseMap['red'] === cell.id) cell.classList.add('home-red');
                if (homeBaseMap['blue'] === cell.id) cell.classList.add('home-blue');
                if (homeBaseMap['green'] === cell.id) cell.classList.add('home-green');
                if (homeBaseMap['yellow'] === cell.id) cell.classList.add('home-yellow');
                if (cell.id === 'cell-3-3') cell.style.backgroundColor = '#e0e0e0';
            }
        }
    }
    
    /** Resets all game state variables to their default values */
    function initializeBoardState() { 
        globalMoveCounter = 0;
        boardState = {};
        // Create an empty array for every cell
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                boardState[`cell-${r}-${c}`] = [];
            }
        }
        // Create an empty array for the off-board area
        boardState['off-board-area'] = [];

        // Create the 4 pawns for each team
        ['red', 'blue', 'green', 'yellow'].forEach(team => {
            const homeBaseId = homeBaseMap[team];
            for (let i = 0; i < 4; i++) {
                const pawn = { 
                    id: `${team[0]}${i}`, // e.g., "r0", "r1"
                    team: team, 
                    arrival: globalMoveCounter++ // 0, 1, 2...
                };
                boardState[homeBaseId].push(pawn);
            }
        });

        // Reset all state flags
        finishedTeams = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
        teamsToSkip = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
        winnersList = [];
        pairWinnerOrder = [];
        isGameOver = false;
    }

    // --- 5. RENDER FUNCTIONS (Data -> HTML) ---
    
    /**
     * Factory function to create a *visual* pawn stack element.
     * This element is temporary and is recreated on every render.
     * @param {string} team - 'red', 'blue', etc.
     * @param {number} count - The number to display on the stack
     * @returns {HTMLElement} The new pawn stack div
     */
    function createPawnStack(team, count) { 
        const stack = document.createElement('div');
        stack.classList.add('pawn-stack', `pawn-stack-${team}`);
        stack.dataset.team = team; // Store team for click handling
        
        const counter = document.createElement('div');
        counter.classList.add('pawn-counter');
        counter.innerText = count;
        stack.appendChild(counter);
        return stack;
    }
    
    /**
     * Updates a *single* cell or container (like 'off-board-area')
     * based on the data in 'boardState'.
     * @param {string} containerId - e.g., "cell-1-2" or "off-board-area"
     */
    function renderContainer(containerId) { 
        const container = document.getElementById(containerId);
        if (!container) return; // Safety check
        
        const pawns = boardState[containerId];
        
        // Clear all *old* pawns from this container
        if (containerId === 'off-board-area') {
            // Don't clear the <h3> title
            container.querySelectorAll('.pawn-stack').forEach(stack => stack.remove());
        } else {
            // Clear everything from a grid cell
            container.innerHTML = '';
        }
        
        // Count pawns in this container, grouped by team
        const teamsInContainer = {};
        if (pawns) {
            pawns.forEach(pawn => {
                if (!teamsInContainer[pawn.team]) teamsInContainer[pawn.team] = 0;
                teamsInContainer[pawn.team]++;
            });
        }
        
        // Create and add new *visual* pawn stacks
        for (const team in teamsInContainer) {
            const count = teamsInContainer[team];
            const stackElement = createPawnStack(team, count);
            container.appendChild(stackElement);
            
            // If this stack is the one currently selected, add the shimmer
            if (selectedPawnInfo && selectedPawnInfo.fromContainerId === containerId && selectedPawnInfo.pawn.team === team) {
                 stackElement.classList.add('selected-pawn');
            }
        }
    }
    
    /** Renders the *entire* board by re-rendering every container. */
    function renderBoard() { 
        for (const containerId in boardState) {
            renderContainer(containerId);
        }
    }

    // --- 6. GAME LOGIC FUNCTIONS ---
    
    /** Checks if two teams are on the same pair in 'Team Mode' */
    function isTeammate(team1, team2) { 
        if (!isPairMode || team1 === team2) return false;
        if ((team1 === 'red' && team2 === 'green') || (team1 === 'green' && team2 === 'red')) return true;
        if ((team1 === 'blue' && team2 === 'yellow') || (team1 === 'yellow' && team2 === 'blue')) return true;
        return false;
    }
    
    /** Returns the teammate of a given team */
    function getTeammate(team) {
        if (team === 'red') return 'green';
        if (team === 'green') return 'red';
        if (team === 'blue') return 'yellow';
        if (team === 'yellow') return 'blue';
        return null;
    }
    
    /**
     * Determines which team the current player can control.
     * (Normally themselves, but in Team Mode, it could be their partner).
     */
    function getTeamToPlay() { 
        if (!isPairMode || !finishedTeams[currentTurn]) {
            return currentTurn;
        }
        // If in pair mode AND this player is finished, play as their teammate
        if (currentTurn === 'red') return 'green';
        if (currentTurn === 'green') return 'red';
        if (currentTurn === 'blue') return 'yellow';
        if (currentTurn === 'yellow') return 'blue';
    }
    
    /** Updates the 'Current Turn' display */
    function updateTurnDisplay() { 
        currentTurn = turnOrder[turnIndex];
        turnDisplay.innerText = currentTurn.toUpperCase();
        turnDisplay.style.backgroundColor = teamColors[currentTurn];
    }
    
    /** Advances to the next valid player's turn, handling skips. */
    function advanceTurn() { 
        if (isGameOver) return;
    
        do {
            turnIndex = (turnIndex + 1) % turnOrder.length;
            const nextTeam = turnOrder[turnIndex];
            
            if (isPairMode && teamsToSkip[nextTeam]) {
                // Team Mode: Use the one-time skip
                teamsToSkip[nextTeam] = false;
                console.log(`${nextTeam.toUpperCase()} skipped their turn.`);
            } else if (!isPairMode && finishedTeams[nextTeam]) {
                // Solo Mode: Skip permanently if finished
                continue; 
            } else {
                // This is a valid turn
                break;
            }
        } while (true);
        
        updateTurnDisplay();
    }
    
    /** Removes the shimmer from the currently selected pawn */
    function clearSelection() { 
        if (selectedPawnInfo) {
            const oldContainer = document.getElementById(selectedPawnInfo.fromContainerId);
            if (oldContainer) {
                const oldPawnStack = oldContainer.querySelector(`.pawn-stack-${selectedPawnInfo.pawn.team}`);
                if (oldPawnStack) oldPawnStack.classList.remove('selected-pawn');
            }
        }
        selectedPawnInfo = null;
    }
    
    /**
     * Handles clicking on a cell to select a pawn.
     * @param {HTMLElement} cellElement - The grid cell that was clicked
     */
    function selectCell(cellElement) { 
        // Rule: Can't select pawns from off-board area
        if (cellElement.id === 'off-board-area') { return; }
        
        const containerId = cellElement.id;
        const pawns = boardState[containerId];
        const teamToSelect = getTeamToPlay(); // Check who we're allowed to play as
        
        // Find the oldest pawn *of that team* in this cell (FIFO)
        const oldestPawnOfTeam = pawns
            .filter(p => p.team === teamToSelect)
            .sort((a, b) => a.arrival - b.arrival)[0];
        
        if (oldestPawnOfTeam) {
            clearSelection(); // Clear any previous selection
            // Store the selected pawn's data
            selectedPawnInfo = { fromContainerId: containerId, pawn: oldestPawnOfTeam };
            // Add the shimmer effect to the visual stack
            const pawnStackElement = cellElement.querySelector(`.pawn-stack-${teamToSelect}`);
            if (pawnStackElement) {
                pawnStackElement.classList.add('selected-pawn');
            }
        }
    }
    
    /**
     * Displays the move/cancel popup next to a target cell.
     * @param {HTMLElement} cellElement - The destination cell
     * @param {boolean} showSelectInstead - Whether to show the "Select this pawn" button
     */
    function showPopup(cellElement, showSelectInstead) { 
        const rect = cellElement.getBoundingClientRect();
        // We use the wrapper for positioning, not the gameContainer
        const containerRect = positionReferenceContainer.getBoundingClientRect();
        
        // Position the popup relative to the wrapper
        popupMenu.style.top = `${rect.top - containerRect.top}px`;
        popupMenu.style.left = `${rect.left - containerRect.left + rect.width + 5}px`;
        
        popupSelectBtn.classList.toggle('hidden', !showSelectInstead);
        popupMenu.classList.remove('hidden');
        cellElement.classList.add('target-cell'); // Add orange shimmer
    }
    
    /** Hides the move/cancel popup and removes shimmer */
    function hidePopup() { 
        popupMenu.classList.add('hidden');
        if (tempDestinationId) {
            const targetCell = document.getElementById(tempDestinationId);
            if (targetCell) targetCell.classList.remove('target-cell');
        }
        tempDestinationId = null;
    }

    /** Shows the 'Repeat/End Turn' modal */
    function showPostMovePopup() {
        modalOverlay.classList.remove('hidden');
        postMovePopup.classList.remove('hidden');
    }
    
    /** Hides the 'Repeat/End Turn' modal */
    function hidePostMovePopup() {
        modalOverlay.classList.add('hidden');
        postMovePopup.classList.add('hidden');
    }

    /** Updates the Winners list HTML */
    function updateWinnersDisplay() {
        winnersListEl.innerHTML = '';
        
        if (!isPairMode) {
            // Solo Mode: Show individual winners
            winnersList.forEach((team, index) => {
                const li = document.createElement('li');
                li.innerText = `${index + 1}: ${team.toUpperCase()}`;
                winnersListEl.appendChild(li);
            });
        } else {
            // Team Mode: Show pair winners
            pairWinnerOrder.forEach((pair, index) => {
                const li = document.createElement('li');
                li.innerText = `${index + 1}: ${pair}`;
                winnersListEl.appendChild(li);
            });
        }
    }
    
    /** Resets the entire game to its initial state */
    function resetGame() {
        console.log("Resetting game...");
        initializeBoardState();
        renderBoard();
        
        turnIndex = 0;
        updateTurnDisplay();
        
        clearSelection();
        hidePopup();
        hidePostMovePopup();
        
        modeToggleBtn.disabled = false;
        
        updateWinnersDisplay();
    }

    /**
     * The main function to execute a move.
     * Handles kill logic, win logic, and turn logic.
     * @param {string} fromId - The source cell ID
     * @param {string} toId - The destination cell ID
     * @param {object} pawn - The pawn object being moved
     */
    function performMove(fromId, toId, pawn) {
        modeToggleBtn.disabled = true; // Lock mode toggle on first move
        let didFinishThisTurn = false; // Flag for auto-ending turn
    
        // --- 1. KILL LOGIC ---
        const isSpecial = specialBlocks.includes(toId);
        const isOffBoard = toId === 'off-board-area';
        
        // Kills only happen on normal blocks
        if (!isSpecial && !isOffBoard) {
            const pawnsInDest = boardState[toId];
            // Find all pawns in the cell that are *not* on the moving pawn's team
            const potentialVictims = pawnsInDest.filter(p => p.team !== pawn.team && !isTeammate(p.team, pawn.team));
            
            if (potentialVictims.length > 0) {
                // Find the victim that arrived first (FIFO)
                const victim = potentialVictims.sort((a, b) => a.arrival - b.arrival)[0];
                const homeBaseId = homeBaseMap[victim.team];
                
                // Remove victim from this cell
                boardState[toId] = boardState[toId].filter(p => p.id !== victim.id);
                // Add victim back to their home base
                boardState[homeBaseId].push(victim);
            }
        }
        
        // --- 2. MOVE LOGIC ---
        // Remove pawn from source cell in the data
        boardState[fromId] = boardState[fromId].filter(p => p.id !== pawn.id);
        // Update its arrival time (for FIFO) and add to destination cell
        pawn.arrival = globalMoveCounter++;
        boardState[toId].push(pawn);
        
        // --- 3. WIN LOGIC ---
        if (toId === 'off-board-area' && !finishedTeams[pawn.team]) {
            // Check if this was the last pawn for this team
            const teamPawnsOffBoard = boardState['off-board-area'].filter(p => p.team === pawn.team);
            
            if (teamPawnsOffBoard.length === 4) {
                didFinishThisTurn = true; // This move finished a team
                finishedTeams[pawn.team] = true;
                
                if (isPairMode) {
                    // --- Pair Mode Win Logic ---
                    teamsToSkip[pawn.team] = true; // Set their one-time skip
                    console.log(`${pawn.team.toUpperCase()} has finished (Pair Mode)`);
                    
                    const teammate = getTeammate(pawn.team);
                    if (finishedTeams[teammate]) {
                        // GAME OVER (Pair Mode)
                        isGameOver = true;
                        const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                        if (!pairWinnerOrder.includes(pairName)) pairWinnerOrder.push(pairName);
                        // Add other pair as 2nd place
                        const otherPairName = (pairName === "Red/Green") ? "Blue/Yellow" : "Red/Green";
                        if (!pairWinnerOrder.includes(otherPairName)) pairWinnerOrder.push(otherPairName);
                        updateWinnersDisplay();
                    }
                } else {
                    // --- Solo Mode Win Logic ---
                    console.log(`${pawn.team.toUpperCase()} has finished (Solo Mode)`);
                    winnersList.push(pawn.team);
                    updateWinnersDisplay();
                    
                    if (winnersList.length === 3) {
                        // GAME OVER (Solo Mode)
                        isGameOver = true;
                        const lastTeam = turnOrder.find(t => !finishedTeams[t]); // Find the 4th place team
                        if(lastTeam) {
                            winnersList.push(lastTeam);
                            finishedTeams[lastTeam] = true;
                            updateWinnersDisplay();
                        }
                    }
                }
            }
        }
        
        // --- 4. RENDER & POST-MOVE ---
        renderBoard(); // Update the visual board
        
        if (isGameOver) {
            console.log("Game has ended. Please reset.");
            // Do nothing, board is now locked
        } else if (didFinishThisTurn) {
            // Player finished, auto-end their turn
            advanceTurn();
            console.log("Player finished, auto-ending turn.");
        } else {
            // Normal move, show the repeat/end popup
            showPostMovePopup();
        }
    }

    // --- 7. EVENT LISTENERS ---
    
    /** Toggle between Solo and Team Mode */
    modeToggleBtn.addEventListener('click', () => { 
        isPairMode = !isPairMode;
        modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    });

    /** Reset the game */
    resetBtn.addEventListener('click', resetGame); 

    /** Handle "Move here" click from the popup */
    popupMoveBtn.addEventListener('click', () => {
        if (selectedPawnInfo && tempDestinationId) {
            const { fromContainerId, pawn } = selectedPawnInfo;
            performMove(fromContainerId, tempDestinationId, pawn);
            clearSelection();
            hidePopup();
        }
    });
    
    /** Handle "Select this pawn" click from the popup */
    popupSelectBtn.addEventListener('click', () => { 
        if (tempDestinationId) {
            const newCellToSelect = document.getElementById(tempDestinationId);
            hidePopup();
            clearSelection();
            selectCell(newCellToSelect);
        }
    });
    
    /** Handle "Cancel" click from the popup */
    popupCancelBtn.addEventListener('click', () => { 
        hidePopup();
    });
    
    /** Handle "Repeat Turn" from the modal */
    repeatTurnBtn.addEventListener('click', () => {
        hidePostMovePopup();
        console.log("Turn Repeated.");
    });
    
    /** Handle "End Turn" from the modal */
    endTurnBtn.addEventListener('click', () => {
        hidePostMovePopup();
        advanceTurn();
        console.log("Turn Ended.");
    });
    
    /**
     * This is the MAIN game click listener, attached to the entire page.
     */
    boardGameBody.addEventListener('click', (event) => {
        // --- 1. CHECK FOR BLOCKERS ---
        // If game is over or a modal is open, ignore all clicks.
        if (isGameOver || !postMovePopup.classList.contains('hidden')) {
            return;
        }
        
        // Find the closest 'pawn-container' (cell or off-board area)
        const clickedContainer = event.target.closest('.pawn-container');
        
        // Ignore clicks on the dice roller or the move popup
        if (event.target.closest('.dice-roller') || event.target.closest('#popup-menu')) {
            return;
        }
        
        // If the click wasn't on a valid container, do nothing
        if (!clickedContainer) return;
        
        const containerId = clickedContainer.id;

        // --- 2. HANDLE THE CLICK ---
        if (!selectedPawnInfo) {
            // --- A. No pawn is selected: This is a SELECTION click ---
            hidePopup();
            selectCell(clickedContainer);
        } else {
            // --- B. A pawn IS selected: This is a MOVE click ---
            const fromId = selectedPawnInfo.fromContainerId;
            
            // If user re-clicks their selected pawn, deselect it
            if (fromId === containerId) {
                clearSelection();
                hidePopup();
                return;
            }
            
            // Store the intended destination
            tempDestinationId = containerId;
            
            let showSelectInstead = false;
            if (containerId !== 'off-board-area') {
                const teamToSelect = getTeamToPlay();
                showSelectInstead = boardState[containerId].some(p => p.team === teamToSelect);
            }
            
            // Show the "Move here" / "Cancel" popup
            showPopup(clickedContainer, showSelectInstead);
        }
    });

    // --- 8. START THE GAME ---
    buildGridCells(); // 1. Create the physical board cells
    
    // 2. Set the initial game state
    initializeBoardState();
    renderBoard();
    updateTurnDisplay();
    
    // 3. Set initial mode button text
    modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    
})(); // End of board game's private scope