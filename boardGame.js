// This is an IIFE (Immediately Invoked Function Expression).
// It creates a private "scope" for the board game, so its
// variables won't conflict with the dice roller's variables.
(function() {
    
    // =========================================================================
    // 1. DOM ELEMENTS
    // =========================================================================
    
    // The main grid container
    const board = document.getElementById('game-board');
    // Wrapper used for calculating popup positions relative to the game area
    const positionReferenceContainer = document.querySelector('.full-game-wrapper');
    // We attach the main listener to the body to catch clicks anywhere
    const boardGameBody = document.body; 
    
    // UI Buttons & Displays
    const offBoardArea = document.getElementById('off-board-area');
    const modeToggleBtn = document.getElementById('mode-toggle');
    const modeDisplay = document.getElementById('mode-display');
    const turnDisplay = document.getElementById('turn-display');
    const resetBtn = document.getElementById('reset-btn');
    const winnersListEl = document.getElementById('winners-list');
    
    // Move/Cancel Popup Elements
    const popupMenu = document.getElementById('popup-menu');
    const popupMoveBtn = document.getElementById('popup-move');
    const popupSelectBtn = document.getElementById('popup-select-instead');
    const popupCancelBtn = document.getElementById('popup-cancel');
    
    // Post-Move Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const postMovePopup = document.getElementById('post-move-popup');
    const repeatTurnBtn = document.getElementById('repeat-turn-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    // Manual Turn Stepper Buttons (Arrows)
    const prevTurnBtn = document.getElementById('prev-turn-btn');
    const nextTurnBtn = document.getElementById('next-turn-btn');


    // =========================================================================
    // 2. GAME RULES & CONSTANTS
    // =========================================================================
    
    // Mapping team names to their starting/home cell IDs
    const homeBaseMap = { 
        'red': 'cell-0-3', 
        'blue': 'cell-3-0', 
        'green': 'cell-6-3', 
        'yellow': 'cell-3-6' 
    };
    
    // List of "Safe" cells where pawns cannot be killed
    const specialBlocks = [ 
        'cell-0-3', // Red Home
        'cell-3-0', // Blue Home
        'cell-6-3', // Green Home
        'cell-3-6', // Yellow Home
        'cell-3-3'  // Center Home
    ];
    
    // The sequence of turns
    const turnOrder = ['red', 'blue', 'green', 'yellow'];
    
    // Colors for the UI display
    const teamColors = { 
        'red': '#e53935', 
        'blue': '#1e88e5', 
        'green': '#43a047', 
        'yellow': '#fdd835' 
    };
    
    // Grid dimensions
    const rows = 7;
    const cols = 7;

    // =========================================================================
    // 3. GAME STATE VARIABLES
    // =========================================================================
    
    let isPairMode = false;         // false = Solo, true = Team (Red/Green vs Blue/Yellow)
    let selectedPawnInfo = null;    // Holds data about the pawn currently selected by the user
    let globalMoveCounter = 0;      // Incrementing counter to track arrival times (FIFO logic)
    let boardState = {};            // The core data model: { cellId: [pawnObj, pawnObj...], ... }
    let turnIndex = 0;              // Index in turnOrder array (0-3)
    let currentTurn = turnOrder[turnIndex]; 
    let tempDestinationId = null;   // Stores the cell ID clicked by user *before* confirming move
    
    // Tracks which teams have moved all 4 pawns off the board
    let finishedTeams = { 
        'red': false, 'blue': false, 'green': false, 'yellow': false 
    };
    
    // Tracks if a team needs to skip their turn (used for the bonus move after finishing)
    let teamsToSkip = { 
        'red': false, 'blue': false, 'green': false, 'yellow': false 
    };
    
    // Lists for end-game rankings
    let winnersList = [];           // For Solo Mode
    let pairWinnerOrder = [];       // For Team Mode
    
    // Master lock flag
    let isGameOver = false;

    
    // =========================================================================
    // 4. INITIALIZATION FUNCTIONS
    // =========================================================================
    
    /** * Creates the 49 (7x7) grid cells in the DOM and adds them to the board container.
     * Runs only once at startup.
     */
    function buildGridCells() { 
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell', 'pawn-container');
                cell.id = `cell-${r}-${c}`;
                board.appendChild(cell);
                
                // Add specific classes for home bases for CSS styling
                if (homeBaseMap['red'] === cell.id) cell.classList.add('home-red');
                if (homeBaseMap['blue'] === cell.id) cell.classList.add('home-blue');
                if (homeBaseMap['green'] === cell.id) cell.classList.add('home-green');
                if (homeBaseMap['yellow'] === cell.id) cell.classList.add('home-yellow');
                // Center block styling
                if (cell.id === 'cell-3-3') cell.style.backgroundColor = '#e0e0e0';
            }
        }
    }
    
    /** * Resets all game state variables to their default starting values.
     * Called on startup and when "Reset Game" is clicked.
     */
    function initializeBoardState() { 
        globalMoveCounter = 0;
        boardState = {};
        
        // Initialize empty arrays for every grid cell
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                boardState[`cell-${r}-${c}`] = [];
            }
        }
        // Initialize off-board area
        boardState['off-board-area'] = [];

        // Create the 4 starting pawns for each team
        ['red', 'blue', 'green', 'yellow'].forEach(team => {
            const homeBaseId = homeBaseMap[team];
            for (let i = 0; i < 4; i++) {
                const pawn = { 
                    id: `${team[0]}${i}`, // Unique ID (e.g., "r0", "b2")
                    team: team, 
                    arrival: globalMoveCounter++ // Assign arrival time
                };
                boardState[homeBaseId].push(pawn);
            }
        });

        // Reset flags
        finishedTeams = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
        teamsToSkip = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
        winnersList = [];
        pairWinnerOrder = [];
        isGameOver = false;
    }

    // =========================================================================
    // 5. RENDER FUNCTIONS (Data -> HTML)
    // =========================================================================
    
    /** * Factory function to create a *visual* pawn stack DOM element.
     * @param {string} team - The color of the stack
     * @param {number} count - The number to display on top
     */
    function createPawnStack(team, count) { 
        const stack = document.createElement('div');
        stack.classList.add('pawn-stack', `pawn-stack-${team}`);
        stack.dataset.team = team; // Store team in dataset for click logic
        
        const counter = document.createElement('div');
        counter.classList.add('pawn-counter');
        counter.innerText = count;
        
        stack.appendChild(counter);
        return stack;
    }
    
    /** * Re-renders the contents of a single container (cell or off-board area).
     * It clears the container and recreates stacks based on current 'boardState'.
     */
    function renderContainer(containerId) { 
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const pawns = boardState[containerId];
        
        // Clear existing visual stacks
        if (containerId === 'off-board-area') {
            // For off-board, remove only pawn-stacks, keep the title
            container.querySelectorAll('.pawn-stack').forEach(stack => stack.remove());
        } else {
            // For grid cells, clear everything
            container.innerHTML = '';
        }
        
        // Group pawns by team to calculate stack numbers
        const teamsInContainer = {};
        if (pawns) {
            pawns.forEach(pawn => {
                if (!teamsInContainer[pawn.team]) teamsInContainer[pawn.team] = 0;
                teamsInContainer[pawn.team]++;
            });
        }
        
        // Create DOM elements for each stack
        for (const team in teamsInContainer) {
            const count = teamsInContainer[team];
            const stackElement = createPawnStack(team, count);
            container.appendChild(stackElement);
            
            // If this specific stack represents the user's selected pawn, highlight it
            if (selectedPawnInfo && 
                selectedPawnInfo.fromContainerId === containerId && 
                selectedPawnInfo.pawn.team === team) {
                 stackElement.classList.add('selected-pawn');
            }
        }
    }
    
    /** Loops through the entire board state and re-renders every container. */
    function renderBoard() { 
        for (const containerId in boardState) {
            renderContainer(containerId);
        }
    }


    // =========================================================================
    // 6. GAME LOGIC HELPER FUNCTIONS
    // =========================================================================
    
    /** Returns true if team1 and team2 are partners in Team Mode. */
    function isTeammate(team1, team2) { 
        if (!isPairMode || team1 === team2) return false;
        if ((team1 === 'red' && team2 === 'green') || (team1 === 'green' && team2 === 'red')) return true;
        if ((team1 === 'blue' && team2 === 'yellow') || (team1 === 'yellow' && team2 === 'blue')) return true;
        return false;
    }
    
    /** Returns the name of the partner team. */
    function getTeammate(team) {
        if (team === 'red') return 'green';
        if (team === 'green') return 'red';
        if (team === 'blue') return 'yellow';
        if (team === 'yellow') return 'blue';
        return null;
    }
    
    /** * Determines which team the current player is allowed to move.
     * Usually their own, but if finished in Team Mode, they move their partner's.
     */
    function getTeamToPlay() { 
        if (!isPairMode || !finishedTeams[currentTurn]) {
            return currentTurn;
        }
        // If in pair mode AND this player is finished, return their teammate
        if (currentTurn === 'red') return 'green';
        if (currentTurn === 'green') return 'red';
        if (currentTurn === 'blue') return 'yellow';
        if (currentTurn === 'yellow') return 'blue';
    }
    
    /** Updates the turn display box color and text. */
    function updateTurnDisplay() { 
        currentTurn = turnOrder[turnIndex];
        turnDisplay.innerText = currentTurn.toUpperCase();
        turnDisplay.style.backgroundColor = teamColors[currentTurn];
    }
    
    /** * Automatically advances to the next valid player.
     * Handles skipping players who are finished (Solo Mode) 
     * or using one-time skips (Team Mode).
     */
    function advanceTurn() { 
        if (isGameOver) return;
    
        do {
            // Move to next index in array (0 -> 1 -> 2 -> 3 -> 0)
            turnIndex = (turnIndex + 1) % turnOrder.length;
            const nextTeam = turnOrder[turnIndex];
            
            if (isPairMode && teamsToSkip[nextTeam]) {
                // Team Mode: Use the one-time skip bonus
                teamsToSkip[nextTeam] = false;
                console.log(`${nextTeam.toUpperCase()} skipped their turn.`);
            } else if (!isPairMode && finishedTeams[nextTeam]) {
                // Solo Mode: Permanently skip finished players
                continue; 
            } else {
                // Found a valid player
                break; 
            }
        } while (true);
        
        updateTurnDisplay();
    }

    /** * NEW: Manually changes the turn (for the arrow buttons).
     * @param {number} offset - +1 for Next, -1 for Previous
     */
    function manualChangeTurn(offset) {
        if (isGameOver) return;

        let newIndex = turnIndex;
        let loopCount = 0;

        // Loop to find the nearest valid player in that direction
        do {
            // Calculate new index handling negative wrap-around
            newIndex = (newIndex + offset + turnOrder.length) % turnOrder.length;
            const nextTeam = turnOrder[newIndex];
            
            // If in solo mode and player is finished, skip them
            if (!isPairMode && finishedTeams[nextTeam]) {
                loopCount++;
                if(loopCount > 4) break; // Prevent infinite loop safety
                continue; 
            }
            break; // Found valid player
        } while (true);

        turnIndex = newIndex;
        updateTurnDisplay();
    }
    
    /** Deselects the currently selected pawn and removes visual effects. */
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

    // =========================================================================
    // 7. INTERACTION LOGIC (Select, Popup, Win)
    // =========================================================================
    
    /** * Logic for selecting a pawn when a cell is clicked.
     * Enforces FIFO rule (selects oldest pawn of the team).
     */
    function selectCell(cellElement) { 
        if (cellElement.id === 'off-board-area') { return; } // Cannot select from off-board
        
        const containerId = cellElement.id;
        const pawns = boardState[containerId];
        const teamToSelect = getTeamToPlay(); // Check whose turn it is
        
        // Filter for pawns of the current team
        // Sort by arrival time to find the one that has been there longest (FIFO)
        const oldestPawnOfTeam = pawns
            .filter(p => p.team === teamToSelect)
            .sort((a, b) => a.arrival - b.arrival)[0];
        
        if (oldestPawnOfTeam) {
            clearSelection(); 
            selectedPawnInfo = { fromContainerId: containerId, pawn: oldestPawnOfTeam };
            
            // Add visual highlight
            const pawnStackElement = cellElement.querySelector(`.pawn-stack-${teamToSelect}`);
            if (pawnStackElement) {
                pawnStackElement.classList.add('selected-pawn');
            }
        }
    }
    
    /** Shows the "Move Here / Cancel" popup next to the target cell. */
    function showPopup(cellElement, showSelectInstead) { 
        const rect = cellElement.getBoundingClientRect();
        const containerRect = positionReferenceContainer.getBoundingClientRect();
        
        popupMenu.style.top = `${rect.top - containerRect.top}px`;
        popupMenu.style.left = `${rect.left - containerRect.left + rect.width + 5}px`;
        popupSelectBtn.classList.toggle('hidden', !showSelectInstead);
        popupMenu.classList.remove('hidden');
        cellElement.classList.add('target-cell'); // Orange shimmer
    }
    
    /** Hides the popup and removes target shimmer. */
    function hidePopup() { 
        popupMenu.classList.add('hidden');
        if (tempDestinationId) {
            const targetCell = document.getElementById(tempDestinationId);
            if (targetCell) targetCell.classList.remove('target-cell');
        }
        tempDestinationId = null;
    }

    /** Shows the "Repeat Turn / End Turn" modal. */
    function showPostMovePopup() {
        modalOverlay.classList.remove('hidden');
        postMovePopup.classList.remove('hidden');
    }
    
    /** Hides the "Repeat Turn / End Turn" modal. */
    function hidePostMovePopup() {
        modalOverlay.classList.add('hidden');
        postMovePopup.classList.add('hidden');
    }

    /** Refreshes the "Winners" list UI. */
    function updateWinnersDisplay() {
        winnersListEl.innerHTML = '';
        
        if (!isPairMode) {
            // Solo Mode: List individual teams
            winnersList.forEach((team, index) => {
                const li = document.createElement('li');
                li.innerText = `${index + 1}: ${team.toUpperCase()}`;
                winnersListEl.appendChild(li);
            });
        } else {
            // Team Mode: List pairs
            pairWinnerOrder.forEach((pair, index) => {
                const li = document.createElement('li');
                li.innerText = `${index + 1}: ${pair}`;
                winnersListEl.appendChild(li);
            });
        }
    }
    
    /** Master Reset Function */
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

    /** * EXECUTE MOVE LOGIC
     * This handles the actual movement, killing, winning, and post-move states.
     */
    function performMove(fromId, toId, pawn) {
        modeToggleBtn.disabled = true; // Lock mode once game starts
        let didFinishThisTurn = false;
    
        // --- 1. KILL LOGIC ---
        const isSpecial = specialBlocks.includes(toId);
        const isOffBoard = toId === 'off-board-area';
        
        // If landing on a standard block (unsafe)
        if (!isSpecial && !isOffBoard) {
            const pawnsInDest = boardState[toId];
            // Identify enemies
            const potentialVictims = pawnsInDest.filter(p => p.team !== pawn.team && !isTeammate(p.team, pawn.team));
            
            if (potentialVictims.length > 0) {
                // FIFO Kill: The oldest enemy pawn is sent home
                const victim = potentialVictims.sort((a, b) => a.arrival - b.arrival)[0];
                const homeBaseId = homeBaseMap[victim.team];
                
                // Update Data
                boardState[toId] = boardState[toId].filter(p => p.id !== victim.id);
                boardState[homeBaseId].push(victim);
            }
        }
        
        // --- 2. MOVE LOGIC ---
        // Remove from source
        boardState[fromId] = boardState[fromId].filter(p => p.id !== pawn.id);
        // Update arrival time to now (moves to back of stack)
        pawn.arrival = globalMoveCounter++;
        // Add to destination
        boardState[toId].push(pawn);
        
        // --- 3. WIN CONDITION LOGIC ---
        if (toId === 'off-board-area' && !finishedTeams[pawn.team]) {
            // Check how many pawns this team has off-board
            const teamPawnsOffBoard = boardState['off-board-area'].filter(p => p.team === pawn.team);
            
            if (teamPawnsOffBoard.length === 4) {
                didFinishThisTurn = true; // Mark that a team finished this turn
                finishedTeams[pawn.team] = true;
                
                if (isPairMode) {
                    // --- PAIR MODE ---
                    teamsToSkip[pawn.team] = true; // Grant one-time skip
                    console.log(`${pawn.team.toUpperCase()} has finished (Pair Mode)`);
                    
                    // Check if partner is also done
                    const teammate = getTeammate(pawn.team);
                    if (finishedTeams[teammate]) {
                        isGameOver = true;
                        
                        // Determine winner names for display
                        const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                        if (!pairWinnerOrder.includes(pairName)) pairWinnerOrder.push(pairName);
                        
                        const otherPairName = (pairName === "Red/Green") ? "Blue/Yellow" : "Red/Green";
                        if (!pairWinnerOrder.includes(otherPairName)) pairWinnerOrder.push(otherPairName);
                        
                        updateWinnersDisplay();
                    }
                } else {
                    // --- SOLO MODE ---
                    console.log(`${pawn.team.toUpperCase()} has finished (Solo Mode)`);
                    winnersList.push(pawn.team);
                    updateWinnersDisplay();
                    
                    // Check if 3 players have finished (meaning game over for the 4th)
                    if (winnersList.length === 3) {
                        isGameOver = true;
                        const lastTeam = turnOrder.find(t => !finishedTeams[t]); 
                        if(lastTeam) {
                            winnersList.push(lastTeam);
                            finishedTeams[lastTeam] = true;
                            updateWinnersDisplay();
                        }
                    }
                }
            }
        }
        
        // --- 4. FINAL RENDER & NEXT STEPS ---
        renderBoard();
        
        if (isGameOver) {
            console.log("Game has ended. Please reset.");
            // No popup, game is locked
        } else if (didFinishThisTurn) {
            // If a team finished, their turn ends automatically
            advanceTurn();
            console.log("Player finished, auto-ending turn.");
        } else {
            // Standard move: Ask player what to do next
            showPostMovePopup();
        }
    }

    // =========================================================================
    // 8. EVENT LISTENERS
    // =========================================================================
    
    // Toggle Game Mode
    modeToggleBtn.addEventListener('click', () => { 
        isPairMode = !isPairMode;
        modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    });

    // Reset Game
    resetBtn.addEventListener('click', resetGame); 

    // Popup: Confirm Move
    popupMoveBtn.addEventListener('click', () => {
        if (selectedPawnInfo && tempDestinationId) {
            const { fromContainerId, pawn } = selectedPawnInfo;
            performMove(fromContainerId, tempDestinationId, pawn);
            clearSelection();
            hidePopup();
        }
    });
    
    // Popup: Select Instead (Change selection to target cell)
    popupSelectBtn.addEventListener('click', () => { 
        if (tempDestinationId) {
            const newCellToSelect = document.getElementById(tempDestinationId);
            hidePopup();
            clearSelection();
            selectCell(newCellToSelect);
        }
    });
    
    // Popup: Cancel
    popupCancelBtn.addEventListener('click', () => { 
        hidePopup();
    });
    
    // Modal: Repeat Turn
    repeatTurnBtn.addEventListener('click', () => {
        hidePostMovePopup();
        console.log("Turn Repeated.");
    });
    
    // Modal: End Turn
    endTurnBtn.addEventListener('click', () => {
        hidePostMovePopup();
        advanceTurn();
        console.log("Turn Ended.");
    });
    
    // Manual Stepper: Previous Turn
    prevTurnBtn.addEventListener('click', () => manualChangeTurn(-1));

    // Manual Stepper: Next Turn
    nextTurnBtn.addEventListener('click', () => manualChangeTurn(1));

    
    /**
     * GLOBAL CLICK LISTENER
     * Handles selection and movement clicks on the board.
     */
    boardGameBody.addEventListener('click', (event) => {
        // 1. Blocker Checks
        if (isGameOver || !postMovePopup.classList.contains('hidden')) {
            return;
        }
        
        // Find clicked cell/container
        const clickedContainer = event.target.closest('.pawn-container');
        
        // Ignore interaction with the dice roller
        if (event.target.closest('.dice-roller')) {
            return;
        }
        
        // Ignore interaction with the popup menu itself
        if (!clickedContainer || event.target.closest('#popup-menu')) return;
        
        const containerId = clickedContainer.id;

        // 2. Selection vs Movement Logic
        if (!selectedPawnInfo) {
            // Case A: Nothing selected -> Select clicked cell
            hidePopup();
            selectCell(clickedContainer);
        } else {
            // Case B: Something selected -> Try to move
            const fromId = selectedPawnInfo.fromContainerId;
            
            // Deselect if clicking same cell
            if (fromId === containerId) {
                clearSelection();
                hidePopup();
                return;
            }

            // Fix: Remove highlight from previous target if changing mind
            if (tempDestinationId) {
                const prevTarget = document.getElementById(tempDestinationId);
                if (prevTarget) prevTarget.classList.remove('target-cell');
            }
            
            tempDestinationId = containerId;
            
            // Check if we should show "Select this pawn" option
            let showSelectInstead = false;
            if (containerId !== 'off-board-area') {
                const teamToSelect = getTeamToPlay();
                showSelectInstead = boardState[containerId].some(p => p.team === teamToSelect);
            }
            
            // Show confirmation popup
            showPopup(clickedContainer, showSelectInstead);
        }
    });

    // =========================================================================
    // 9. STARTUP
    // =========================================================================
    buildGridCells(); 
    initializeBoardState();
    renderBoard();
    updateTurnDisplay();
    
    // Set initial text
    modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    
})(); // End of board game IIFE