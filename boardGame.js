// This is an IIFE (Immediately Invoked Function Expression).
// It creates a private "scope" for the board game, so its
// variables won't conflict with the dice roller's variables.
(function () {

    // --- 0. AUDIO SETUP (Tone.js) ---
    const moveSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0
        }
    }).toDestination();
    const killSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0
        }
    }).toDestination();
    const successSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: "triangle"
        },
        envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.1,
            release: 1
        }
    }).toDestination();
    const resetSynth = new Tone.NoiseSynth({
        noise: {
            type: 'pink'
        },
        envelope: {
            attack: 0.01,
            decay: 0.3,
            sustain: 0
        }
    }).toDestination();

    function triggerSound(type) {
        if (Tone.context.state !== 'running') Tone.start(); // Ensure audio is ready
        const now = Tone.now();
        switch (type) {
            case 'move':
                moveSynth.triggerAttackRelease("C5", "8n", now);
                break;
            case 'kill':
                killSynth.triggerAttackRelease("G2", "8n", now);
                break;
            case 'return':
                moveSynth.triggerAttackRelease("A3", "16n", now);
                moveSynth.triggerAttackRelease("E3", "16n", now + 0.1);
                break;
            case 'finish':
                successSynth.triggerAttackRelease(["C5", "E5", "G5"], "8n", now);
                break;
            case 'gameover':
                successSynth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1n", now);
                break;
            case 'reset':
                resetSynth.triggerAttackRelease("8n", now);
                break;
        }
    }

    // =========================================================================
    // 1. DOM ELEMENTS
    // =========================================================================

    const board = document.getElementById('game-board');
    const positionReferenceContainer = document.querySelector('.full-game-wrapper');
    const boardGameBody = document.body;

    const offBoardArea = document.getElementById('off-board-area');
    const modeToggleBtn = document.getElementById('mode-toggle');
    const modeDisplay = document.getElementById('mode-display');
    const turnDisplay = document.getElementById('turn-display');
    const resetBtn = document.getElementById('reset-btn');
    const winnersListEl = document.getElementById('winners-list');

    // Popup Elements
    const popupMenu = document.getElementById('popup-menu');
    const popupMoveBtn = document.getElementById('popup-move');
    const popupSelectBtn = document.getElementById('popup-select-instead');
    const popupCancelBtn = document.getElementById('popup-cancel');

    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const postMovePopup = document.getElementById('post-move-popup');
    const repeatTurnBtn = document.getElementById('repeat-turn-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');

    // Stepper Buttons
    const prevTurnBtn = document.getElementById('prev-turn-btn');
    const nextTurnBtn = document.getElementById('next-turn-btn');


    // =========================================================================
    // 2. GAME RULES & CONSTANTS
    // =========================================================================

    const homeBaseMap = {
        'red': 'cell-0-3',
        'blue': 'cell-3-0',
        'green': 'cell-6-3',
        'yellow': 'cell-3-6'
    };
    const specialBlocks = ['cell-0-3', 'cell-3-0', 'cell-6-3', 'cell-3-6', 'cell-3-3'];
    const turnOrder = ['red', 'blue', 'green', 'yellow'];
    const teamColors = {
        'red': '#e53935',
        'blue': '#1e88e5',
        'green': '#43a047',
        'yellow': '#fdd835'
    };
    const rows = 7;
    const cols = 7;

    // Pre-calculated paths for each team
    const TEAM_PATHS = {
        'red': [
            'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0',
            'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6',
            'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4',
            'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4',
            'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-3-3', 'off-board-area'
        ],
        'blue': [
            'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6',
            'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2',
            'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5',
            'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1',
            'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-3-3', 'cell-3-2', 'cell-3-3', 'off-board-area'
        ],
        'green': [
            'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6',
            'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0',
            'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2',
            'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2',
            'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-3-3', 'off-board-area'
        ],
        'yellow': [
            'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0',
            'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4',
            'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1',
            'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5',
            'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-3-3', 'off-board-area'
        ]
    };

    // =========================================================================
    // 3. GAME STATE VARIABLES
    // =========================================================================

    let isPairMode = false;
    let selectedPawnInfo = null;
    let globalMoveCounter = 0;
    let boardState = {};
    let turnIndex = 0;
    let currentTurn = turnOrder[turnIndex];
    let tempDestinationId = null;
    let finishedTeams = {
        'red': false,
        'blue': false,
        'green': false,
        'yellow': false
    };
    let teamsToSkip = {
        'red': false,
        'blue': false,
        'green': false,
        'yellow': false
    };
    let winnersList = [];
    let pairWinnerOrder = [];
    let isGameOver = false;
    let isTurnOrderReversed = false;
    let isAnimating = false;


    // =========================================================================
    // 4. INITIALIZATION FUNCTIONS
    // =========================================================================

    function buildGridCells() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell', 'pawn-container');
                cell.id = `cell-${r}-${c}`;

                // Layer logic for visuals
                const dist = Math.max(Math.abs(r - 3), Math.abs(c - 3));
                if (dist === 3) cell.classList.add('layer-outer');
                else if (dist === 2) cell.classList.add('layer-middle');
                else if (dist === 1) cell.classList.add('layer-inner');
                else if (dist === 0) cell.classList.add('layer-center');

                board.appendChild(cell);

                if (homeBaseMap['red'] === cell.id) cell.classList.add('home-red');
                if (homeBaseMap['blue'] === cell.id) cell.classList.add('home-blue');
                if (homeBaseMap['green'] === cell.id) cell.classList.add('home-green');
                if (homeBaseMap['yellow'] === cell.id) cell.classList.add('home-yellow');
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
                const pawn = {
                    id: `${team[0]}${i}`,
                    team: team,
                    arrival: globalMoveCounter++
                };
                boardState[homeBaseId].push(pawn);
            }
        });

        finishedTeams = {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        };
        teamsToSkip = {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        };
        winnersList = [];
        pairWinnerOrder = [];
        isGameOver = false;
        isTurnOrderReversed = false;
    }

    // =========================================================================
    // 5. RENDER FUNCTIONS
    // =========================================================================

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

        if (containerId === 'off-board-area') {
            container.querySelectorAll('.pawn-stack').forEach(stack => stack.remove());
        } else {
            container.innerHTML = '';
        }

        const teamsInContainer = {};
        if (pawns) {
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


    // =========================================================================
    // 6. GAME LOGIC FUNCTIONS
    // =========================================================================

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

        board.classList.remove('board-turn-red', 'board-turn-blue', 'board-turn-green', 'board-turn-yellow');
        board.classList.add(`board-turn-${currentTurn}`);
    }

    function advanceTurn() {
        if (isGameOver) return;
        do {
            if (isTurnOrderReversed) {
                turnIndex = (turnIndex - 1 + turnOrder.length) % turnOrder.length;
            } else {
                turnIndex = (turnIndex + 1) % turnOrder.length;
            }
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

    function manualChangeTurn(offset) {
        if (isGameOver) return;
        let newIndex = turnIndex;
        let loopCount = 0;
        do {
            newIndex = (newIndex + offset + turnOrder.length) % turnOrder.length;
            const nextTeam = turnOrder[newIndex];
            if (!isPairMode && finishedTeams[nextTeam]) {
                loopCount++;
                if (loopCount > 4) break;
                continue;
            }
            break;
        } while (true);
        turnIndex = newIndex;
        updateTurnDisplay();
    }

    // * --- NEW: Highlight Path Logic --- *
    function clearPathHighlights() {
        const highlighted = document.querySelectorAll('.path-highlight');
        highlighted.forEach(el => {
            el.classList.remove('path-highlight', 'path-highlight-red', 'path-highlight-blue', 'path-highlight-green', 'path-highlight-yellow');
            el.style.animationDelay = '0s';
        });
        if (offBoardArea) {
            offBoardArea.classList.remove('path-highlight', 'path-highlight-red', 'path-highlight-blue', 'path-highlight-green', 'path-highlight-yellow');
        }
    }

    function highlightPath(team, currentCellId) {
        const path = TEAM_PATHS[team];
        if (!path) return;

        const currentIndex = path.indexOf(currentCellId);
        if (currentIndex === -1) return;

        // * --- FIX: Limit to 12 steps ahead --- *
        // This prevents the "lightshow" of 50+ blocks and restricts user focus
        const maxSteps = 12;
        const remainingPath = path.slice(currentIndex + 1, currentIndex + 1 + maxSteps);

        remainingPath.forEach((cellId, index) => {
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.classList.add('path-highlight', `path-highlight-${team}`);
                // Slightly slower stagger (0.1s) for a clearer, calmer wave effect
                cell.style.animationDelay = `${index * 0.1}s`;
            }
        });
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
        clearPathHighlights(); // Clear highlights when deselected
    }

    function selectCell(cellElement) {
        if (cellElement.id === 'off-board-area') {
            return;
        }

        const containerId = cellElement.id;
        const pawns = boardState[containerId];
        const teamToSelect = getTeamToPlay();

        const oldestPawnOfTeam = pawns
            .filter(p => p.team === teamToSelect)
            .sort((a, b) => a.arrival - b.arrival)[0];

        if (oldestPawnOfTeam) {
            clearSelection();
            selectedPawnInfo = {
                fromContainerId: containerId,
                pawn: oldestPawnOfTeam
            };

            const pawnStackElement = cellElement.querySelector(`.pawn-stack-${teamToSelect}`);
            if (pawnStackElement) {
                pawnStackElement.classList.add('selected-pawn');
            }

            // Trigger highlighting
            highlightPath(teamToSelect, containerId);
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

    function resetGame() {
        console.log("Resetting game...");
        triggerSound('reset');
        initializeBoardState();
        renderBoard();

        turnIndex = 0;
        updateTurnDisplay();

        clearSelection();
        hidePopup();
        hidePostMovePopup();

        modeToggleBtn.disabled = false;

        updateWinnersDisplay();
        isTurnOrderReversed = false;
    }

    // --- ANIMATION HELPERS ---

    /** Plays a specific sound element */
    function playGameSound(id) {
        const audio = document.getElementById(id);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn(e));
        }
    }

    // --- ANIMATION HELPERS ---
    function getElementCoords(element) {
        const gameRect = positionReferenceContainer.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        // Center the 26px pawn inside the cell (13 is half of 26)
        const x = (elemRect.left - gameRect.left) + (elemRect.width / 2) - 13;
        const y = (elemRect.top - gameRect.top) + (elemRect.height / 2) - 13;
        return {
            x,
            y
        };
    }

    async function animatePawnMovement(team, startId, stepIds) {
        const startCell = document.getElementById(startId);
        const startCoords = getElementCoords(startCell);

        // Create floating pawn
        const floater = document.createElement('div');
        floater.classList.add('floating-pawn', `pawn-stack-${team}`);
        floater.style.left = `${startCoords.x}px`;
        floater.style.top = `${startCoords.y}px`;

        // Add counter "1"
        const counter = document.createElement('div');
        counter.classList.add('pawn-counter');
        counter.innerText = "1";
        floater.appendChild(counter);

        positionReferenceContainer.appendChild(floater);
        floater.offsetHeight; // Trigger layout

        // Step through path
        for (const stepId of stepIds) {
            const targetCell = document.getElementById(stepId);
            const targetCoords = getElementCoords(targetCell);

            triggerSound('move'); // Sound on every step

            floater.style.left = `${targetCoords.x}px`;
            floater.style.top = `${targetCoords.y}px`;

            await new Promise(resolve => setTimeout(resolve, 250)); // Wait for CSS transition
        }

        floater.remove();
    }

    // --- UPDATED MOVE FUNCTION ---
    async function performMove(fromId, toId, pawn) {
        // 1. Lock Board
        isAnimating = true; // Lock clicks
        modeToggleBtn.disabled = true;
        if (popupMoveBtn) popupMoveBtn.disabled = true;

        let didFinishThisTurn = false;

        // 2. Calculate Path
        const path = TEAM_PATHS[pawn.team];
        const startIndex = path.indexOf(fromId);
        const endIndex = path.indexOf(toId);
        const stepsToTravel = path.slice(startIndex + 1, endIndex + 1);

        // 3. Remove Visual from Start
        boardState[fromId] = boardState[fromId].filter(p => p.id !== pawn.id);
        renderContainer(fromId);

        // 4. Animate (Wait for this to finish!)
        await animatePawnMovement(pawn.team, fromId, stepsToTravel);

        // 5. Update Data at Destination
        pawn.arrival = globalMoveCounter++;
        boardState[toId].push(pawn);

        // 6. Kill Logic
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

                triggerSound('kill');
                setTimeout(() => triggerSound('return'), 400);
            }
        }

        // 7. Win Logic
        if (toId === 'off-board-area') {
            triggerSound('finish');

            if (!finishedTeams[pawn.team]) {
                const teamPawnsOffBoard = boardState['off-board-area'].filter(p => p.team === pawn.team);
                if (teamPawnsOffBoard.length === 4) {
                    didFinishThisTurn = true;
                    finishedTeams[pawn.team] = true;

                    if (isPairMode) {
                        teamsToSkip[pawn.team] = true;
                        const teammate = getTeammate(pawn.team);
                        if (finishedTeams[teammate]) {
                            isGameOver = true;
                            // (Update pairWinnerOrder logic here...)
                            const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                            if (!pairWinnerOrder.includes(pairName)) pairWinnerOrder.push(pairName);
                            const otherPairName = (pairName === "Red/Green") ? "Blue/Yellow" : "Red/Green";
                            if (!pairWinnerOrder.includes(otherPairName)) pairWinnerOrder.push(otherPairName);
                            updateWinnersDisplay();
                            triggerSound('gameover');
                        }
                    } else {
                        winnersList.push(pawn.team);
                        updateWinnersDisplay();
                        if (winnersList.length === 3) {
                            isGameOver = true;
                            // (Update lastTeam logic here...)
                            const lastTeam = turnOrder.find(t => !finishedTeams[t]);
                            if (lastTeam) {
                                winnersList.push(lastTeam);
                                finishedTeams[lastTeam] = true;
                                updateWinnersDisplay();
                            }
                            triggerSound('gameover');
                        }
                    }
                }
            }
        }

        // 8. Unlock & Final Render
        renderBoard();
        isAnimating = false; // Unlock clicks
        if (popupMoveBtn) popupMoveBtn.disabled = false;

        if (isGameOver) {
            console.log("Game has ended. Please reset.");
        } else if (didFinishThisTurn) {
            advanceTurn();
        } else {
            showPostMovePopup();
        }
    }

    // =========================================================================
    // 7. EVENT LISTENERS
    // =========================================================================

    modeToggleBtn.addEventListener('click', () => {
        isPairMode = !isPairMode;
        modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';
    });

    resetBtn.addEventListener('click', resetGame);

    popupMoveBtn.addEventListener('click', () => {
        if (selectedPawnInfo && tempDestinationId) {
            const {
                fromContainerId,
                pawn
            } = selectedPawnInfo;
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

    prevTurnBtn.addEventListener('click', () => manualChangeTurn(-1));
    nextTurnBtn.addEventListener('click', () => manualChangeTurn(1));


    // MAIN GAME CLICK LISTENER
    boardGameBody.addEventListener('click', (event) => {
        if (isGameOver || isAnimating || !postMovePopup.classList.contains('hidden')) {
            return;
        }

        const clickedContainer = event.target.closest('.pawn-container');

        if (event.target.closest('.dice-roller') || event.target.closest('#popup-menu')) {
            return;
        }

        if (!clickedContainer) return;

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

            // Fix: Remove highlight from previous target if changing mind
            if (tempDestinationId) {
                const prevTarget = document.getElementById(tempDestinationId);
                if (prevTarget) prevTarget.classList.remove('target-cell');
            }

            // * --- NEW: Path & Step Restriction --- *
            const currentTeam = selectedPawnInfo.pawn.team;
            const path = TEAM_PATHS[currentTeam];
            const currentIndex = path.indexOf(fromId);
            const targetIndex = path.indexOf(containerId);

            // Calculate steps
            const steps = targetIndex - currentIndex;

            // Enforce rules:
            // 1. Target must be in the path (targetIndex !== -1)
            // 2. Target must be ahead of current position (steps > 0)
            // 3. Target must be within 12 steps (steps <= 12)
            if (targetIndex === -1 || steps <= 0 || steps > 12) {
                // Invalid move; do nothing (ignore click)
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

    // =========================================================================
    // 8. START THE GAME
    // =========================================================================
    buildGridCells();
    initializeBoardState();
    renderBoard();
    updateTurnDisplay();
    modeDisplay.innerText = isPairMode ? 'Team Mode' : 'Solo Mode';

})(); // End of board game IIFE