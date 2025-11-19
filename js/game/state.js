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

        /** Resets state to default */
        reset: function () {
            const Config = LudoGame.Config;

            this.globalMoveCounter = 0;
            this.boardState = {};

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