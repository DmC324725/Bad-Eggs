/**
 * state.js
 * Manages all mutable game state variables.
 */

// Ensure namespace
window.LudoGame = window.LudoGame || {};

(function () {
    // --- 3. GAME STATE VARIABLES ---
    LudoGame.State = {
        isPairMode: false,
        selectedPawnInfo: null,
        globalMoveCounter: 0,
        boardState: {},
        turnIndex: 0,
        currentTurn: 'red', // Will be overwritten by init
        tempDestinationId: null,

        finishedTeams: {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        },
        teamsToSkip: {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        },
        winnersList: [],
        pairWinnerOrder: [],

        isGameOver: false,
        isAnimating: false, // <--- Added this flag
        isTurnOrderReversed: false, // <--- Added this flag

        // NEW: History Stack
        moveHistory: [],

        /** Saves a snapshot of the current game data */
        saveHistory: function () {
            const snapshot = {
                // JSON stringify/parse is a simple way to deep-clone data objects
                boardState: JSON.parse(JSON.stringify(this.boardState)),
                finishedTeams: JSON.parse(JSON.stringify(this.finishedTeams)),
                teamsToSkip: JSON.parse(JSON.stringify(this.teamsToSkip)),
                winnersList: [...this.winnersList],
                pairWinnerOrder: [...this.pairWinnerOrder],

                // Primitives
                globalMoveCounter: this.globalMoveCounter,
                turnIndex: this.turnIndex,
                currentTurn: this.currentTurn,
                isGameOver: this.isGameOver
            };
            this.moveHistory.push(snapshot);
        },

        /** Restores the last snapshot. Returns true if successful. */
        undo: function () {
            if (this.moveHistory.length === 0) return false;

            const snapshot = this.moveHistory.pop();

            // Restore data
            this.boardState = snapshot.boardState;
            this.finishedTeams = snapshot.finishedTeams;
            this.teamsToSkip = snapshot.teamsToSkip;
            this.winnersList = snapshot.winnersList;
            this.pairWinnerOrder = snapshot.pairWinnerOrder;
            this.globalMoveCounter = snapshot.globalMoveCounter;
            this.turnIndex = snapshot.turnIndex;
            this.currentTurn = snapshot.currentTurn;
            this.isGameOver = snapshot.isGameOver;

            return true;
        },

        /** Resets state to default */
        reset: function () {
            const Config = LudoGame.Config;

            this.globalMoveCounter = 0;
            this.boardState = {};
            this.moveHistory = [];

            // Grid
            for (let r = 0; r < Config.ROWS; r++) {
                for (let c = 0; c < Config.COLS; c++) {
                    this.boardState[`cell-${r}-${c}`] = [];
                }
            }
            this.boardState['off-board-area'] = [];

            // Pawns
            ['red', 'blue', 'green', 'yellow'].forEach(team => {
                const homeBaseId = Config.HOME_BASE_MAP[team];
                for (let i = 0; i < 4; i++) {
                    const pawn = {
                        id: `${team[0]}${i}`,
                        team: team,
                        arrival: this.globalMoveCounter++
                    };
                    this.boardState[homeBaseId].push(pawn);
                }
            });

            // Flags
            this.finishedTeams = {
                'red': false,
                'blue': false,
                'green': false,
                'yellow': false
            };
            this.teamsToSkip = {
                'red': false,
                'blue': false,
                'green': false,
                'yellow': false
            };
            this.winnersList = [];
            this.pairWinnerOrder = [];
            this.isGameOver = false;
            this.isAnimating = false;
            this.isTurnOrderReversed = false;

            this.selectedPawnInfo = null;
            this.tempDestinationId = null;
            this.turnIndex = 0;
            this.currentTurn = Config.TURN_ORDER[0];
        }
    };
})();