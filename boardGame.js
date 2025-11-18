(function() {
    // This IIFE protects the board game's variables.
    
    // --- Get BOARD GAME DOM Elements ---
    const board = document.getElementById('game-board');
    const positionReferenceContainer = document.querySelector('.full-game-wrapper');
    const boardGameBody = document.body; // New global listener target
    
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

    // --- Game Rules & Constants ---
    const homeBaseMap = { 'red': 'cell-0-3', 'blue': 'cell-3-0', 'green': 'cell-6-3', 'yellow': 'cell-3-6' };
    const specialBlocks = [ 'cell-0-3', 'cell-3-0', 'cell-6-3', 'cell-3-6', 'cell-3-3' ];
    const turnOrder = ['red', 'blue', 'green', 'yellow'];
    const teamColors = { 'red': '#e53935', 'blue': '#1e88e5', 'green': '#43a047', 'yellow': '#fdd835' };
    const rows = 7;
    const cols = 7;

    // --- Game State Variables ---
    let isPairMode = false;
    let selectedPawnInfo = null;
    let globalMoveCounter = 0;
    let boardState = {};
    let turnIndex = 0;
    let currentTurn = turnOrder[turnIndex];
    let tempDestinationId = null;
    let finishedTeams = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
    let teamsToSkip = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
    let winnersList = [];
    let pairWinnerOrder = [];
    let isGameOver = false;
    
    // --- Initialization Functions ---
    function buildGridCells() { 
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell', 'pawn-container');
                cell.id = `cell-${r}-${c}`;
                board.appendChild(cell);
                if (homeBaseMap['red'] === cell.id) cell.classList.add('home-red');
                if (homeBaseMap['blue'] === cell.id) cell.classList.add('home-blue');
                if (homeBaseMap['green'] === cell.id) cell.classList.add('home-green');
                if (homeBaseMap['yellow'] === cell.id) cell.classList.add('home-yellow');
                if (cell.id === 'cell-3-3') cell.style.backgroundColor = '#e0e0e0';
            }
        }
    }
    
    function initializeBoardState() { 
        globalMoveCounter = 0;
        boardState = {};
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                boardState[`cell-${r}-${c}`] = [];
            }
        }
        boardState['off-board-area'] = [];

        ['red', 'blue', 'green', 'yellow'].forEach(team => {
            const homeBaseId = homeBaseMap[team];
            for (let i = 0; i < 4; i++) {
                const pawn = { id: `${team[0]}${i}`, team: team, arrival: globalMoveCounter++ };
                boardState[homeBaseId].push(pawn);
            }
        });

        finishedTeams = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
        teamsToSkip = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
        winnersList = [];
        pairWinnerOrder = [];
        isGameOver = false;
    }

    // --- Render Functions ---
    function createPawnStack(team, count) { 
        const stack = document.createElement('div');
        stack.classList.add('pawn-stack', `pawn-stack-${team}`);
        stack.dataset.team = team; 
        const counter = document.createElement('div');
        counter.classList.add('pawn-counter');
        counter.innerText = count;
        stack.appendChild(counter);
        return stack;
    }
    
    function renderContainer(containerId) { 
        const container = document.getElementById(containerId);
        if (!container) return;
        const pawns = boardState[containerId];
        
        // For the off-board area, we just want to append pawns, not clear the <h3>
        if (containerId === 'off-board-area') {
            container.querySelectorAll('.pawn-stack').forEach(stack => stack.remove());
        } else {
            container.innerHTML = ''; // Clear regular cells
        }
        
        const teamsInContainer = {};
        if (pawns) { // Add safety check for pawns
            pawns.forEach(pawn => {
                if (!teamsInContainer[pawn.team]) teamsInContainer[pawn.team] = 0;
                teamsInContainer[pawn.team]++;
            });
        }
        for (const team in teamsInContainer) {
            const count = teamsInContainer[team];
            const stackElement = createPawnStack(team, count);
            container.appendChild(stackElement);
            if (selectedPawnInfo && selectedPawnInfo.fromContainerId === containerId && selectedPawnInfo.pawn.team === team) {
                 stackElement.classList.add('selected-pawn');
            }
        }
    }
    
    function renderBoard() { 
        for (const containerId in boardState) {
            renderContainer(containerId);
        }
    }

    // --- Game Logic Functions ---
    function isTeammate(team1, team2) { 
        if (!isPairMode || team1 === team2) return false;
        if ((team1 === 'red' && team2 === 'green') || (team1 === 'green' && team2 === 'red')) return true;
        if ((team1 === 'blue' && team2 === 'yellow') || (team1 === 'yellow' && team2 === 'blue')) return true;
        return false;
    }
    
    function getTeammate(team) {
        if (team === 'red') return 'green';
        if (team === 'green') return 'red';
        if (team === 'blue') return 'yellow';
        if (team === 'yellow') return 'blue';
        return null;
    }
    
    function getTeamToPlay() { 
        if (!isPairMode || !finishedTeams[currentTurn]) {
            return currentTurn;
        }
        if (currentTurn === 'red') return 'green';
        if (currentTurn === 'green') return 'red';
        if (currentTurn === 'blue') return 'yellow';
        if (currentTurn === 'yellow') return 'blue';
    }
    
    function updateTurnDisplay() { 
        currentTurn = turnOrder[turnIndex];
        turnDisplay.innerText = currentTurn.toUpperCase();
        turnDisplay.style.backgroundColor = teamColors[currentTurn];
    }
    
    function advanceTurn() { 
        if (isGameOver) return;
    
        do {
            turnIndex = (turnIndex + 1) % turnOrder.length;
            const nextTeam = turnOrder[turnIndex];
            
            if (isPairMode && teamsToSkip[nextTeam]) {
                teamsToSkip[nextTeam] = false;
                console.log(`${nextTeam.toUpperCase()} skipped their turn.`);
            } else if (!isPairMode && finishedTeams[nextTeam]) {
                continue; 
            } else {
                break;
            }
        } while (true);
        
        updateTurnDisplay();
    }
    
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
    
    function selectCell(cellElement) { 
        if (cellElement.id === 'off-board-area') { return; }
        const containerId = cellElement.id;
        const pawns = boardState[containerId];
        const teamToSelect = getTeamToPlay();
        const oldestPawnOfTeam = pawns
            .filter(p => p.team === teamToSelect)
            .sort((a, b) => a.arrival - b.arrival)[0];
        if (oldestPawnOfTeam) {
            clearSelection();
            selectedPawnInfo = { fromContainerId: containerId, pawn: oldestPawnOfTeam };
            const pawnStackElement = cellElement.querySelector(`.pawn-stack-${teamToSelect}`);
            if (pawnStackElement) {
                pawnStackElement.classList.add('selected-pawn');
            }
        }
    }
    
    function showPopup(cellElement, showSelectInstead) { 
        const rect = cellElement.getBoundingClientRect();
        const containerRect = positionReferenceContainer.getBoundingClientRect();
        
        popupMenu.style.top = `${rect.top - containerRect.top}px`;
        popupMenu.style.left = `${rect.left - containerRect.left + rect.width + 5}px`;
        popupSelectBtn.classList.toggle('hidden', !showSelectInstead);
        popupMenu.classList.remove('hidden');
        cellElement.classList.add('target-cell');
    }
    
    function hidePopup() { 
        popupMenu.classList.add('hidden');
        if (tempDestinationId) {
            const targetCell = document.getElementById(tempDestinationId);
            if (targetCell) targetCell.classList.remove('target-cell');
        }
        tempDestinationId = null;
    }

    function showPostMovePopup() {
        modalOverlay.classList.remove('hidden');
        postMovePopup.classList.remove('hidden');
    }
    
    function hidePostMovePopup() {
        modalOverlay.classList.add('hidden');
        postMovePopup.classList.add('hidden');
    }

    function updateWinnersDisplay() {
        winnersListEl.innerHTML = '';
        
        if (!isPairMode) {
            winnersList.forEach((team, index) => {
                const li = document.createElement('li');
                li.innerText = `${index + 1}: ${team.toUpperCase()}`;
                winnersListEl.appendChild(li);
            });
        } else {
            pairWinnerOrder.forEach((pair, index) => {
                const li = document.createElement('li');
                li.innerText = `${index + 1}: ${pair}`;
                winnersListEl.appendChild(li);
            });
        }
    }
    
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

    function performMove(fromId, toId, pawn) {
        modeToggleBtn.disabled = true;
        let didFinishThisTurn = false;
    
        const isSpecial = specialBlocks.includes(toId);
        const isOffBoard = toId === 'off-board-area';
        if (!isSpecial && !isOffBoard) {
            const pawnsInDest = boardState[toId];
            const potentialVictims = pawnsInDest.filter(p => p.team !== pawn.team && !isTeammate(p.team, pawn.team));
            
            if (potentialVictims.length > 0) {
                const victim = potentialVictims.sort((a, b) => a.arrival - b.arrival)[0];
                const homeBaseId = homeBaseMap[victim.team];
                boardState[toId] = boardState[toId].filter(p => p.id !== victim.id);
                boardState[homeBaseId].push(victim);
            }
        }
        
        boardState[fromId] = boardState[fromId].filter(p => p.id !== pawn.id);
        pawn.arrival = globalMoveCounter++;
        boardState[toId].push(pawn);
        
        if (toId === 'off-board-area' && !finishedTeams[pawn.team]) {
            const teamPawnsOffBoard = boardState['off-board-area'].filter(p => p.team === pawn.team);
            
            if (teamPawnsOffBoard.length === 4) {
                didFinishThisTurn = true;
                finishedTeams[pawn.team] = true;
                
                if (isPairMode) {
                    teamsToSkip[pawn.team] = true;
                    console.log(`${pawn.team.toUpperCase()} has finished (Pair Mode)`);
                    
                    const teammate = getTeammate(pawn.team);
                    if (finishedTeams[teammate]) {
                        isGameOver = true;
                        const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                        if (!pairWinnerOrder.includes(pairName)) pairWinnerOrder.push(pairName);
                        const otherPairName = (pairName === "Red/Green") ? "Blue/Yellow" : "Red/Green";
                        if (!pairWinnerOrder.includes(otherPairName)) pairWinnerOrder.push(otherPairName);
                        updateWinnersDisplay();
                    }
                } else {
                    console.log(`${pawn.team.toUpperCase()} has finished (Solo Mode)`);
                    winnersList.push(pawn.team);
                    updateWinnersDisplay();
                    
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
        
        renderBoard();
        
        if (isGameOver) {
            console.log("Game has ended. Please reset.");
        } else if (didFinishThisTurn) {
            advanceTurn();
            console.log("Player finished, auto-ending turn.");
        } else {
            showPostMovePopup();
        }
    }

    // --- Event Listeners ---
    modeToggleBtn.addEventListener('click', () => { 
        isPairMode = !isPairMode;
        modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    });

    resetBtn.addEventListener('click', resetGame); 

    popupMoveBtn.addEventListener('click', () => {
        if (selectedPawnInfo && tempDestinationId) {
            const { fromContainerId, pawn } = selectedPawnInfo;
            performMove(fromContainerId, tempDestinationId, pawn);
            clearSelection();
            hidePopup();
        }
    });
    popupSelectBtn.addEventListener('click', () => { 
        if (tempDestinationId) {
            const newCellToSelect = document.getElementById(tempDestinationId);
            hidePopup();
            clearSelection();
            selectCell(newCellToSelect);
        }
    });
    popupCancelBtn.addEventListener('click', () => { 
        hidePopup();
    });
    
    repeatTurnBtn.addEventListener('click', () => {
        hidePostMovePopup();
        console.log("Turn Repeated.");
    });
    
    endTurnBtn.addEventListener('click', () => {
        hidePostMovePopup();
        advanceTurn();
        console.log("Turn Ended.");
    });
    
    boardGameBody.addEventListener('click', (event) => {
        if (isGameOver || !postMovePopup.classList.contains('hidden')) {
            return;
        }
        
        const clickedContainer = event.target.closest('.pawn-container');
        
        if (event.target.closest('.dice-roller')) {
            return;
        }
        
        if (!clickedContainer || event.target.closest('#popup-menu')) return;
        
        const containerId = clickedContainer.id;

        if (!selectedPawnInfo) {
            hidePopup();
            selectCell(clickedContainer);
        } else {
            const fromId = selectedPawnInfo.fromContainerId;
            if (fromId === containerId) {
                clearSelection();
                hidePopup();
                return;
            }
            tempDestinationId = containerId;
            let showSelectInstead = false;
            if (containerId !== 'off-board-area') {
                const teamToSelect = getTeamToPlay();
                showSelectInstead = boardState[containerId].some(p => p.team === teamToSelect);
            }
            showPopup(clickedContainer, showSelectInstead);
        }
    });

    // --- Start the Game ---
    buildGridCells(); // 1. Create the physical board cells
    
    // 2. Set the initial game state
    initializeBoardState();
    renderBoard();
    updateTurnDisplay();
    
    // 3. Set initial mode button text
    modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    
})(); // End of board game IIFE