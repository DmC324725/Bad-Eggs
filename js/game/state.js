/**
 * state.js
 * Manages the state of the game (whose turn it is, where pawns are, who won).
 */

window.LudoGame = window.LudoGame || {};

(function () {
    LudoGame.State = {
        isPairMode: false, // Game Mode
        selectedPawnInfo: null, // Currently selected pawn data
        globalMoveCounter: 0, // FIFO tracking
        boardState: {}, // Holds pawn positions
        turnIndex: 0, // Current player index
        currentTurn: 'red', // Current player string
        tempDestinationId: null, // Destination clicked by user

        // Win condition flags
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

        // Locks
        isGameOver: false,
        isAnimating: false,

        /**
         * Resets all state variables to the start of a new game.
         * Populates the boardState with initial pawn positions.
         */
        reset: function () {
            this.globalMoveCounter = 0;
            this.boardState = {};

            // Initialize grid cells
            const rows = LudoGame.Config.ROWS;
            const cols = LudoGame.Config.COLS;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    this.boardState[`cell-${r}-${c}`] = [];
                }
            }
            this.boardState['off-board-area'] = [];

            // Place pawns in home bases
            ['red', 'blue', 'green', 'yellow'].forEach(team => {
                const homeBaseId = LudoGame.Config.HOME_BASE_MAP[team];
                for (let i = 0; i < 4; i++) {
                    const pawn = {
                        id: `${team[0]}${i}`,
                        team: team,
                        arrival: this.globalMoveCounter++
                    };
                    this.boardState[homeBaseId].push(pawn);
                }
            });

            // Reset flags
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
            this.selectedPawnInfo = null;
            this.tempDestinationId = null;
            this.turnIndex = 0;
            this.currentTurn = LudoGame.Config.TURN_ORDER[0];
        }
    };
})();