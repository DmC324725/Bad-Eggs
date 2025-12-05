/**
 * INTELLIGENT AUTO-MOVE GAME BUNDLE (FINAL FIXED VERSION)
 * =============================================================================
 * This script handles the complete logic for a Ludo game including:
 * 1. Dice Physics & Audio (Tone.js)
 * 2. Board Logic (State management, turn rotation, win conditions)
 * 3. Specific Rule Sets:
 * - Strict Pathing: Pawns follow a hardcoded coordinate array.
 * - Anchor Rule: Cannot move the last pawn from home until a kill is made.
 * - Gatekeeper Rule: Cannot enter inner layers (Index > 23) without a kill.
 * - Pair Mode: Teammate assistance logic.
 * * Dependencies: Tone.js (for audio), external SVG assets.
 * =============================================================================
 */

(function () {
    "use strict";

    // --- NAMESPACE INITIALIZATION ---
    // We use global namespaces to allow debugging from the console if necessary.
    window.LudoGame = window.LudoGame || {};
    window.DiceGame = window.DiceGame || {};

    /* ==========================================================================
       PART 1: DICE GAME ENGINE
       Handles the visual representation of dice, randomization, and sound effects.
       ========================================================================== */

    DiceGame.Config = {
        NUM_DICE: 6, // Number of dice to roll visually
        MIN_ROLL_TIME: 400, // Minimum animation duration (ms)
        MAX_ROLL_TIME: 1200, // Maximum animation duration (ms)
        // Colors used for the confetti explosion on a roll of 12
        CONFETTI_COLORS: ['confetti-yellow', 'confetti-cyan', 'confetti-pink', 'confetti-lime']
    };

    // SVG Definitions for Dice Faces (0 = Skull/Fail, 1 = Dot/Success)
    // Note: Dimensions are set to 100% to allow CSS control for mobile responsiveness.
    DiceGame.SVGs = {
        face0: `<svg style="width:100%; height:100%; color:#9ca3af; stroke:currentColor; stroke-width:2.5px; overflow: visible;" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
        face1: `<svg style="width:100%; height:100%; color:#22d3ee; overflow: visible;" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" /></svg>`,
        rolling: `<svg style="width:100%; height:100%; color:white; animation: spin 1s linear infinite; overflow: visible;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`
    };

    // --- AUDIO SYNTHESIS (Tone.js) ---
    // Initializes synthesizers only when needed to adhere to browser autoplay policies.
    let diceSynths = null;

    function getDiceSynths() {
        if (diceSynths) return diceSynths;
        try {
            if (window.Tone) {
                diceSynths = {
                    // Percussive sound for shaking
                    rattle: new Tone.MembraneSynth({
                        pitchDecay: 0.01,
                        octaves: 2,
                        envelope: {
                            attack: 0.001,
                            decay: 0.1,
                            sustain: 0
                        }
                    }).toDestination(),
                    // Thud sound for landing
                    land: new Tone.MembraneSynth({
                        pitchDecay: 0.005,
                        octaves: 3,
                        envelope: {
                            attack: 0.001,
                            decay: 0.05,
                            sustain: 0
                        }
                    }).toDestination(),
                    // Special sound for high rolls
                    special: new Tone.Synth({
                        oscillator: {
                            type: 'triangle'
                        },
                        envelope: {
                            attack: 0.005,
                            decay: 0.1,
                            sustain: 0.3,
                            release: 0.5
                        }
                    }).toDestination(),
                    // Noise textures for celebration
                    shaker6: new Tone.NoiseSynth({
                        noise: {
                            type: 'white'
                        },
                        envelope: {
                            attack: 0.005,
                            decay: 0.15,
                            sustain: 0
                        }
                    }).toDestination(),
                    shaker12: new Tone.NoiseSynth({
                        noise: {
                            type: 'white'
                        },
                        envelope: {
                            attack: 0.005,
                            decay: 0.4,
                            sustain: 0
                        }
                    }).toDestination(),
                    clap: new Tone.MembraneSynth({
                        pitchDecay: 0.01,
                        octaves: 4,
                        envelope: {
                            attack: 0.001,
                            decay: 0.1,
                            sustain: 0
                        }
                    }).toDestination()
                };
            }
        } catch (e) {
            console.warn("Audio init failed", e);
        }
        return diceSynths;
    }

    DiceGame.Audio = {
        init: function () {
            try {
                if (window.Tone && Tone.context.state !== 'running') Tone.start().catch(() => {});
                getDiceSynths();
            } catch (e) {}
        },
        playRattle: function () {
            try {
                const s = getDiceSynths();
                if (s) {
                    s.rattle.triggerAttackRelease("C1", "8n", Tone.now());
                    s.rattle.triggerAttackRelease("G0", "8n", Tone.now() + 0.08);
                }
            } catch (e) {}
        },
        playLand: function () {
            try {
                const s = getDiceSynths();
                if (s) s.land.triggerAttackRelease("C2", "8n", Tone.now());
            } catch (e) {}
        },
        playCelebration6: function () {
            try {
                const s = getDiceSynths();
                if (s) {
                    s.shaker6.triggerAttackRelease(Tone.now());
                    s.clap.triggerAttackRelease("C3", "8n", Tone.now() + 0.01);
                }
            } catch (e) {}
        },
        playCelebration12: function () {
            try {
                const s = getDiceSynths();
                if (s) {
                    s.shaker12.triggerAttackRelease(Tone.now());
                    s.special.triggerAttackRelease("G5", "8n", Tone.now() + 0.05);
                }
            } catch (e) {}
        }
    };

    // --- DICE VISUAL MANAGER ---
    DiceGame.UI = {
        elements: {},
        init: function () {
            // Cache DOM elements for performance
            this.elements = {
                container: document.getElementById('dice-container'),
                dice: document.querySelectorAll('.dice'),
                display: document.getElementById('result-display'),
                confetti: document.getElementById('confetti-container')
            };
            return !!this.elements.container;
        },
        setResult: function (text, classType) {
            if (!this.elements.display) return;
            this.elements.display.innerText = text;
            this.elements.display.className = '';
            if (classType) this.elements.display.classList.add(classType);
        },
        resetVisuals: function () {
            if (!this.elements.display) return;
            this.elements.display.innerText = '0';
            this.elements.display.className = '';
            if (this.elements.dice) {
                this.elements.dice.forEach(die => {
                    die.innerHTML = `<div>${DiceGame.SVGs.face0}</div>`;
                    die.className = 'dice dice-bg-0';
                });
            }
            if (this.elements.confetti) this.elements.confetti.innerHTML = '';
        },
        setDieLoading: function () {
            if (!this.elements.dice) return;
            this.elements.dice.forEach(die => {
                die.innerHTML = `<div>${DiceGame.SVGs.rolling}</div>`;
                die.className = 'dice dice-bg-rolling';
            });
        },
        updateDieFace: function (index, value) {
            if (!this.elements.dice || !this.elements.dice[index]) return;
            const die = this.elements.dice[index];
            // Swap SVG based on 0 or 1 result
            if (value === 0) {
                die.innerHTML = `<div>${DiceGame.SVGs.face0}</div>`;
                die.className = 'dice dice-bg-0';
            } else {
                die.innerHTML = `<div>${DiceGame.SVGs.face1}</div>`;
                die.className = 'dice dice-bg-1';
            }
        },
        triggerConfetti: function () {
            // Generates simple DOM-based particles for celebration
            if (!this.elements.confetti) return;
            const colors = DiceGame.Config.CONFETTI_COLORS;
            for (let i = 0; i < 30; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece ' + colors[i % colors.length];
                piece.style.left = `${Math.random() * 100}%`;
                piece.style.top = '-20px';
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
                this.elements.confetti.appendChild(piece);
                setTimeout(() => {
                    piece.style.transform = `translateY(${300 + Math.random() * 100}px) rotate(${Math.random() * 360}deg)`;
                    piece.style.opacity = '0';
                }, 10);
                setTimeout(() => piece.remove(), 2000);
            }
        }
    };

    // --- DICE LOGIC CORE ---
    DiceGame.Core = {
        roll: function (forcedRolls = null) {
            // Guard clause: Don't roll if no rolls pending or animation in progress
            if (window.LudoGame.State.pendingRolls <= 0 || window.LudoGame.State.isAnimating) return;

            DiceGame.Audio.init();
            DiceGame.UI.setResult('...');
            DiceGame.UI.setDieLoading();
            DiceGame.Audio.playRattle();

            const container = document.getElementById('dice-container');
            if (container) container.style.pointerEvents = 'none';

            let diceLandedCount = 0;
            let sum = 0;
            const config = DiceGame.Config;
            let finished = false;

            // Failsafe timeout to ensure game proceeds even if animation hangs
            setTimeout(() => {
                if (!finished) {
                    finished = true;
                    DiceGame.Core.finalizeRoll(sum > 0 ? sum : 4);
                }
            }, 2500);

            // Roll each die with a random delay for "cascading" effect
            for (let i = 0; i < config.NUM_DICE; i++) {
                const result = (forcedRolls) ? forcedRolls[i] : Math.floor(Math.random() * 2);
                if (forcedRolls) sum += result;
                const duration = Math.random() * (config.MAX_ROLL_TIME - config.MIN_ROLL_TIME) + config.MIN_ROLL_TIME;

                setTimeout(() => {
                    if (finished) return;
                    DiceGame.UI.updateDieFace(i, result);
                    DiceGame.Audio.playLand();
                    diceLandedCount++;
                    if (!forcedRolls) sum += result;
                    // When all dice land, finalize the score
                    if (diceLandedCount === config.NUM_DICE) {
                        finished = true;
                        DiceGame.Core.finalizeRoll(sum);
                    }
                }, duration);
            }
        },

        finalizeRoll: function (total) {
            // Special Rule: If total is 0, it counts as 12 (Maximum)
            const finalScore = (total === 0) ? 12 : total;
            let resultClass = 'dice-result-normal';

            if (finalScore === 12) {
                resultClass = 'dice-result-12';
                DiceGame.Audio.playCelebration12();
                DiceGame.UI.triggerConfetti();
            } else if (finalScore === 6) {
                resultClass = 'dice-result-6';
                DiceGame.Audio.playCelebration6();
            }

            DiceGame.UI.setResult(finalScore, resultClass);

            // Handover control to Ludo Game Core
            if (window.LudoGame && window.LudoGame.Core) {
                window.LudoGame.Core.onDiceRolled(finalScore);
            }
        }
    };

    /* ==========================================================================
       PART 2: LUDO GAME ENGINE
       ========================================================================== */

    LudoGame.Config = {
        ROWS: 7,
        COLS: 7,
        // Maps team colors to their starting div IDs
        HOME_BASE_MAP: {
            'red': 'cell-0-3',
            'blue': 'cell-3-0',
            'green': 'cell-6-3',
            'yellow': 'cell-3-6'
        },
        // Cells where pawns cannot be killed (Globes/Starts)
        SPECIAL_BLOCKS: ['cell-0-3', 'cell-3-0', 'cell-6-3', 'cell-3-6', 'cell-3-3'],
        TURN_ORDER: ['red', 'blue', 'green', 'yellow'],
        TEAM_COLORS: {
            'red': '#e53935',
            'blue': '#1e88e5',
            'green': '#43a047',
            'yellow': '#fdd835'
        },
        // Hardcoded paths for every team. Crucial for the "Strict Path" logic.
        TEAM_PATHS: {
            'red': ['cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-3-3', 'off-board-area'],
            'blue': ['cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-3-3', 'off-board-area'],
            'green': ['cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-3-3', 'off-board-area'],
            'yellow': ['cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-3-3', 'off-board-area']
        }
    };

    // --- GAME STATE MANAGEMENT ---
    LudoGame.State = {
        isPairMode: false,
        activeTeams: [],
        selectedPawnInfo: null,
        globalMoveCounter: 0, // Unique ID generation for pawns
        boardState: {}, // Maps 'cell-id' => [pawnObjects]
        turnIndex: 0,
        currentTurn: 'red',
        tempDestinationId: null,

        // Win Tracking
        finishedTeams: {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        },

        // Skip Flag: If a team finishes in Pair Mode, they skip ONE turn then play for partner
        teamsToSkip: {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        },

        // Gatekeeper Flag: Has this team killed anyone? (Required to enter Layer 2)
        hasKilled: {
            'red': false,
            'blue': false,
            'green': false,
            'yellow': false
        },

        winnersList: [],
        pairWinnerOrder: [],
        isGameOver: false,
        isAnimating: false,
        isTurnOrderReversed: false,

        // Move Banking (Handling 6/12 bonus rolls)
        moveBank: [],
        selectedBankIndex: -1,
        pendingRolls: 1,
        moveHistory: [],

        // Snapshot for Undo functionality
        saveHistory: function () {
            this.moveHistory.push(JSON.parse(JSON.stringify({
                boardState: this.boardState,
                finishedTeams: this.finishedTeams,
                teamsToSkip: this.teamsToSkip,
                hasKilled: this.hasKilled, // CRITICAL: Save kill state for Undo
                winnersList: this.winnersList,
                pairWinnerOrder: this.pairWinnerOrder,
                globalMoveCounter: this.globalMoveCounter,
                turnIndex: this.turnIndex,
                currentTurn: this.currentTurn,
                isGameOver: this.isGameOver,
                moveBank: this.moveBank,
                pendingRolls: this.pendingRolls,
                activeTeams: this.activeTeams
            })));
        },
        undo: function () {
            if (this.moveHistory.length === 0) return false;
            Object.assign(this, this.moveHistory.pop());
            return true;
        },
        // Complete Game Reset
        reset: function () {
            this.globalMoveCounter = 0;
            this.boardState = {};
            this.moveHistory = [];
            this.moveBank = [];
            this.selectedBankIndex = -1;
            this.pendingRolls = 1;

            // Re-enable player count selection
            const countSel = document.getElementById('player-count-select');
            const count = countSel ? parseInt(countSel.value) : 4;
            if (countSel) countSel.disabled = false;

            // Setup Active Teams based on player count
            if (count === 2) {
                this.activeTeams = ['red', 'green'];
            } else if (count === 3) {
                this.activeTeams = ['red', 'blue', 'green'];
            } else {
                this.activeTeams = ['red', 'blue', 'green', 'yellow'];
            }

            // Initialize Grid Logic
            const Config = LudoGame.Config;
            for (let r = 0; r < Config.ROWS; r++) {
                for (let c = 0; c < Config.COLS; c++) this.boardState[`cell-${r}-${c}`] = [];
            }
            this.boardState['off-board-area'] = [];

            // Spawn Pawns at Home
            this.activeTeams.forEach(team => {
                const home = Config.HOME_BASE_MAP[team];
                for (let i = 0; i < 4; i++) {
                    this.boardState[home].push({
                        id: `${team[0]}${i}`,
                        team: team,
                        arrival: this.globalMoveCounter++
                    });
                }
            });

            // Reset Flags
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
            this.hasKilled = {
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

            this.turnIndex = 0;
            this.currentTurn = this.activeTeams[0];

            // Sync UI
            DiceGame.UI.resetVisuals();
            LudoGame.UI.updateTurn(); // Fix: Ensures Red turn is highlighted immediately
            LudoGame.UI.updateRollButtonState();
        }
    };

    // --- BOARD AUDIO SYNTHESIS ---
    let boardSynths = null;

    function getBoardSynths() {
        if (boardSynths) return boardSynths;
        try {
            if (window.Tone) {
                boardSynths = {
                    move: new Tone.MembraneSynth({
                        pitchDecay: 0.01,
                        octaves: 2,
                        envelope: {
                            attack: 0.001,
                            decay: 0.1,
                            sustain: 0
                        }
                    }).toDestination(),
                    kill: new Tone.MembraneSynth({
                        pitchDecay: 0.05,
                        octaves: 4,
                        envelope: {
                            attack: 0.001,
                            decay: 0.2,
                            sustain: 0
                        }
                    }).toDestination(),
                    success: new Tone.PolySynth(Tone.Synth, {
                        oscillator: {
                            type: "triangle"
                        },
                        envelope: {
                            attack: 0.02,
                            decay: 0.1,
                            sustain: 0.1,
                            release: 1
                        }
                    }).toDestination(),
                    reset: new Tone.NoiseSynth({
                        noise: {
                            type: 'pink'
                        },
                        envelope: {
                            attack: 0.01,
                            decay: 0.3,
                            sustain: 0
                        }
                    }).toDestination()
                };
            }
        } catch (e) {
            console.warn("Board audio init failed", e);
        }
        return boardSynths;
    }

    LudoGame.Audio = {
        trigger: function (type) {
            try {
                if (window.Tone && Tone.context.state !== 'running') Tone.start().catch(() => {});
                const s = getBoardSynths();
                if (!s) return;
                const now = Tone.now();
                switch (type) {
                    case 'move':
                        s.move.triggerAttackRelease("C5", "8n", now);
                        break;
                    case 'kill':
                        s.kill.triggerAttackRelease("G2", "8n", now);
                        break;
                    case 'return':
                        s.move.triggerAttackRelease("A3", "16n", now);
                        s.move.triggerAttackRelease("E3", "16n", now + 0.1);
                        break;
                    case 'finish':
                        s.success.triggerAttackRelease(["C5", "E5", "G5"], "8n", now);
                        break;
                    case 'gameover':
                        s.success.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1n", now);
                        break;
                    case 'reset':
                        s.reset.triggerAttackRelease("8n", now);
                        break;
                }
            } catch (e) {}
        }
    };

    // --- UTILITIES ---
    LudoGame.Utils = {
        // Checks if two colors are partners in Pair Mode (Red+Green, Blue+Yellow)
        isTeammate: function (t1, t2) {
            if (!LudoGame.State.isPairMode || t1 === t2) return false;
            if ((t1 === 'red' && t2 === 'green') || (t1 === 'green' && t2 === 'red')) return true;
            if ((t1 === 'blue' && t2 === 'yellow') || (t1 === 'yellow' && t2 === 'blue')) return true;
            return false;
        },
        getTeammate: function (t) {
            if (t === 'red') return 'green';
            if (t === 'green') return 'red';
            if (t === 'blue') return 'yellow';
            if (t === 'yellow') return 'blue';
            return null;
        },
        // Determines whose pawns to move (Self or Partner if finished)
        getTeamToPlay: function () {
            const current = LudoGame.State.currentTurn;
            if (!LudoGame.State.isPairMode || !LudoGame.State.finishedTeams[current]) return current;
            return this.getTeammate(current);
        },
        distFromCenter: function (r, c) {
            return Math.max(Math.abs(r - 3), Math.abs(c - 3));
        }
    };

    // --- BOARD UI RENDERING ---
    LudoGame.UI = {
        elements: {},
        init: function () {
            this.elements = {
                board: document.getElementById('game-board'),
                wrapper: document.querySelector('.full-game-wrapper'),
                turnDisplay: document.getElementById('turn-display'),
                winnersList: document.getElementById('winners-list'),
                modeDisplay: document.getElementById('mode-display'),
                modeBtn: document.getElementById('mode-toggle'),
                popup: document.getElementById('popup-menu'),
                popupMoveBtn: document.getElementById('popup-move'),
                selectBtn: document.getElementById('popup-select-instead'),
                modal: document.getElementById('modal-overlay'),
                postPopup: document.getElementById('post-move-popup')
            };
            return !!this.elements.board;
        },
        // Generates the 7x7 Grid with layers
        buildGrid: function () {
            if (!this.elements.board) {
                this.elements.board = document.getElementById('game-board');
                if (!this.elements.board) return;
            }

            const {
                ROWS,
                COLS,
                HOME_BASE_MAP
            } = LudoGame.Config;
            this.elements.board.innerHTML = '';

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = document.createElement('div');
                    cell.classList.add('grid-cell', 'pawn-container');
                    cell.id = `cell-${r}-${c}`;
                    const dist = LudoGame.Utils.distFromCenter(r, c);
                    if (dist === 3) cell.classList.add('layer-outer');
                    else if (dist === 2) cell.classList.add('layer-middle');
                    else if (dist === 1) cell.classList.add('layer-inner');
                    else if (dist === 0) cell.classList.add('layer-center');
                    this.elements.board.appendChild(cell);
                    // Mark Home Bases visually
                    if (HOME_BASE_MAP['red'] === cell.id) cell.classList.add('home-red');
                    if (HOME_BASE_MAP['blue'] === cell.id) cell.classList.add('home-blue');
                    if (HOME_BASE_MAP['green'] === cell.id) cell.classList.add('home-green');
                    if (HOME_BASE_MAP['yellow'] === cell.id) cell.classList.add('home-yellow');
                }
            }
        },
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
        renderContainer: function (id) {
            const container = document.getElementById(id);
            if (!container) return;
            const pawns = LudoGame.State.boardState[id];

            if (id === 'off-board-area') container.querySelectorAll('.pawn-stack').forEach(el => el.remove());
            else container.innerHTML = '';

            const groups = {};
            if (pawns) pawns.forEach(p => {
                groups[p.team] = (groups[p.team] || 0) + 1;
            });
            for (const team in groups) {
                const el = this.createPawn(team, groups[team]);
                container.appendChild(el);
            }
        },
        renderBoard: function () {
            if (!this.elements.board) return;
            for (const id in LudoGame.State.boardState) this.renderContainer(id);
        },
        // Renders the list of available dice rolls (if multiples pending)
        renderMoveBank: function () {
            const bankList = document.getElementById('move-bank-list');
            const bankDisplay = document.getElementById('move-bank-display');
            if (!bankList || !bankDisplay) return;

            bankList.innerHTML = '';
            const bank = LudoGame.State.moveBank;
            const selectedIdx = LudoGame.State.selectedBankIndex;

            bank.forEach((val, index) => {
                const btn = document.createElement('button');
                btn.className = 'bank-item';
                btn.innerText = val;
                if (index === selectedIdx) btn.classList.add('selected');

                btn.addEventListener('click', () => {
                    LudoGame.State.selectedBankIndex = index;
                    LudoGame.UI.renderMoveBank();
                });
                bankList.appendChild(btn);
            });
        },
        updateRollButtonState: function () {
            const diceContainer = document.getElementById('dice-container');
            const bankDisplay = document.getElementById('move-bank-display');
            
            if (!diceContainer) return;

            const canRoll = LudoGame.State.pendingRolls > 0 && !LudoGame.State.isGameOver && !LudoGame.State.isAnimating;

            if (canRoll) {
                // Active State
                diceContainer.style.opacity = "1";
                diceContainer.style.cursor = "pointer";
                diceContainer.style.pointerEvents = "auto";
                if (bankDisplay) bankDisplay.style.opacity = "0.5"; // Dim the bank while we need to roll
            } else {
                // Disabled State (Waiting for move or animation)
                diceContainer.style.opacity = "0.5";
                diceContainer.style.cursor = "default";
                diceContainer.style.pointerEvents = "none"; // Prevent clicks
                if (bankDisplay) bankDisplay.style.opacity = "1"; // Highlight the bank if we have moves
            }
        },
        // Update the visual indicator of whose turn it is
        updateTurn: function () {
            if (!this.elements.turnDisplay) return;
            const turn = LudoGame.State.currentTurn;
            this.elements.turnDisplay.style.backgroundColor = LudoGame.Config.TEAM_COLORS[turn];
            this.elements.turnDisplay.style.transform = "scale(1.2)";
            setTimeout(() => {
                if (this.elements.turnDisplay) this.elements.turnDisplay.style.transform = "scale(1)";
            }, 200);

            if (this.elements.board) {
                this.elements.board.classList.remove('board-turn-red', 'board-turn-blue', 'board-turn-green', 'board-turn-yellow');
                this.elements.board.classList.add(`board-turn-${turn}`);
            }
        },
        updateWinners: function () {
            if (!this.elements.winnersList) return;
            this.elements.winnersList.innerHTML = '';
            const list = LudoGame.State.isPairMode ? LudoGame.State.pairWinnerOrder : LudoGame.State.winnersList;
            list.forEach((name, i) => {
                const li = document.createElement('li');
                li.innerText = `${i + 1}: ${name.toUpperCase()}`;
                this.elements.winnersList.appendChild(li);
            });
        },
        // Helpers for popup/modal controls (mostly unused in strict click mode but kept for safety)
        highlightPath: function (team, startId) {},
        clearHighlights: function () {
            document.querySelectorAll('.path-highlight').forEach(el => {
                el.className = el.className.replace(/path-highlight.*/, '').trim();
                el.style.animationDelay = '0s';
            });
        },
        showPopup: function (cell, showSelect) {},
        hidePopup: function () {
            if (!this.elements.popup) return;
            this.elements.popup.classList.add('hidden');
        },
        showPostMove: function () {
            if (!this.elements.modal) return;
            this.elements.modal.classList.remove('hidden');
            this.elements.postPopup.classList.remove('hidden');
        },
        hidePostMove: function () {
            if (!this.elements.modal) return;
            this.elements.modal.classList.add('hidden');
            this.elements.postPopup.classList.add('hidden');
        },
        // Calculates screen coordinates for animations
        getCoords: function (el) {
            const r1 = this.elements.wrapper.getBoundingClientRect();
            const r2 = el.getBoundingClientRect();
            return {
                x: (r2.left - r1.left) + (r2.width / 2) - 13,
                y: (r2.top - r1.top) + (r2.height / 2) - 13
            };
        },
        // Handles the floating pawn animation
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
            this.elements.wrapper.appendChild(floater);
            floater.offsetHeight;

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

    // --- GAME LOGIC CORE ---
    LudoGame.Core = {
        /**
         * Calculates all valid moves for the current player based on dice roll.
         * Enforces strict rules: Anchor, Gatekeeper, Path Boundaries.
         */
        getValidMoves: function (team, diceValue) {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const Utils = LudoGame.Utils;

            // 1. Determine Effective Team
            // In Pair Mode, if I am finished, I control my partner's pawns.
            let effectiveTeam = team;
            if (State.isPairMode && State.finishedTeams[team]) {
                effectiveTeam = Utils.getTeammate(team);
                // If partner is also finished, game logic handles game over elsewhere
                if (State.finishedTeams[effectiveTeam]) return [];
            }

            // 2. Setup Restriction Data
            const homeId = Config.HOME_BASE_MAP[effectiveTeam];

            // Count pawns at home for the Anchor Rule
            const pawnsAtHomeCount = State.boardState[homeId] ?
                State.boardState[homeId].filter(p => p.team === effectiveTeam).length : 0;

            // Count finished pawns for the Anchor Rule
            const pawnsFinishedCount = State.boardState['off-board-area'] ?
                State.boardState['off-board-area'].filter(p => p.team === effectiveTeam).length : 0;

            const validMoves = [];
            const path = Config.TEAM_PATHS[effectiveTeam];
            const GATE_INDEX = 23; // Index of the last cell in the Outer Layer

            // Iterate through every cell on the board
            for (const [cellId, pawns] of Object.entries(State.boardState)) {
                if (cellId === 'off-board-area') continue;

                // Only look at pawns belonging to the effective team
                const teamPawns = pawns.filter(p => p.team === effectiveTeam);

                if (teamPawns.length > 0) {
                    const pawn = teamPawns[0];

                    // --- RESTRICTION A: ANCHOR PAWN ---
                    // Rule: Cannot move the *last* pawn from Home Base unless at least one pawn has finished.
                    if (cellId === homeId && pawnsAtHomeCount === 1 && pawnsFinishedCount === 0) {
                        continue;
                    }

                    const currentIdx = path.indexOf(cellId);
                    if (currentIdx !== -1) {
                        let targetIdx = currentIdx + diceValue;

                        // --- RESTRICTION B: KILL GATE (Layer 2 Lock) ---
                        // Rule: If trying to pass Index 23 (Enter Inner Layer) AND team hasn't killed anyone...
                        // Then loop back to start of Outer Layer (Index 0).
                        if (targetIdx > GATE_INDEX && !State.hasKilled[effectiveTeam]) {
                            targetIdx = targetIdx - (GATE_INDEX + 1);
                        }

                        // Boundary Check: Ensure move is within path array limits
                        if (targetIdx < path.length) {
                            validMoves.push({
                                fromId: cellId,
                                toId: path[targetIdx],
                                pawn: pawn
                            });
                        }
                    }
                }
            }
            return validMoves;
        },

        // Triggered when dice animation completes
        onDiceRolled: function (score) {
            const State = LudoGame.State;
            State.moveBank.push(score);
            State.pendingRolls--;

            // Bonus Roll Rule: 6 or 12 grants another turn
            let bonusEarned = false;
            if (score === 6 || score === 12) {
                bonusEarned = true;
                State.pendingRolls++;
            }

            const moves = this.getValidMoves(State.currentTurn, score);

            // Auto-Resolution Logic
            if (moves.length === 0) {
                console.log("No valid moves. Skipping turn.");
                State.pendingRolls = 0;
                State.moveBank = [];
                setTimeout(() => this.advanceTurn(), 1000);

            } else if (moves.length === 1) {
                console.log("Single move possible. Auto-executing.");
                State.selectedBankIndex = State.moveBank.length - 1;
                const m = moves[0];
                this.performMove(m.fromId, m.toId, m.pawn);

            } else {
                // Multiple moves: Wait for user input
                State.selectedBankIndex = State.moveBank.length - 1;
                LudoGame.UI.renderMoveBank();
                LudoGame.UI.updateRollButtonState();
            }
        },

        clearSelection: function () {},

        // Handles Turn Rotation
        advanceTurn: function () {
            const State = LudoGame.State;
            const UI = LudoGame.UI;
            if (State.isGameOver) return;

            do {
                const totalActive = State.activeTeams.length;
                if (State.isTurnOrderReversed) {
                    State.turnIndex = (State.turnIndex - 1 + totalActive) % totalActive;
                } else {
                    State.turnIndex = (State.turnIndex + 1) % totalActive;
                }

                const next = State.activeTeams[State.turnIndex];

                if (State.isPairMode) {
                    // Pair Mode Skip Logic:
                    // If 'teamsToSkip' is set (just finished), consume flag and skip once.
                    if (State.teamsToSkip[next] === true) {
                        State.teamsToSkip[next] = false;
                        continue;
                    }
                    break;
                } else {
                    // Solo Mode: Skip finished players entirely
                    if (State.finishedTeams[next]) {
                        continue;
                    } else {
                        break;
                    }
                }
            } while (true);

            State.currentTurn = State.activeTeams[State.turnIndex];
            State.moveBank = [];
            State.selectedBankIndex = -1;
            State.pendingRolls = 1;
            UI.updateTurn();
            UI.renderMoveBank();
            UI.updateRollButtonState();
            DiceGame.UI.resetVisuals();
        },

        reverseLastMove: function () {
            const State = LudoGame.State;
            const UI = LudoGame.UI;
            if (State.isAnimating) return;
            if (State.undo()) {
                UI.renderBoard();
                UI.updateTurn();
                UI.updateWinners();
                UI.renderMoveBank();
                UI.updateRollButtonState();
                LudoGame.Audio.trigger('return');
            }
        },

        manualTurnChange: function (offset) {
            const State = LudoGame.State;
            if (State.isGameOver) return;
            LudoGame.UI.hidePopup();

            let idx = State.turnIndex;
            let safety = 0;
            const totalActive = State.activeTeams.length;

            do {
                idx = (idx + offset + totalActive) % totalActive;
                const next = State.activeTeams[idx];
                if (!State.isPairMode && State.finishedTeams[next]) {
                    safety++;
                    if (safety > 4) break;
                    continue;
                }
                break;
            } while (true);

            State.turnIndex = idx;
            State.currentTurn = State.activeTeams[idx];

            State.moveBank = [];
            State.pendingRolls = 1;
            LudoGame.UI.updateTurn();
            LudoGame.UI.renderMoveBank();
            LudoGame.UI.updateRollButtonState();
            DiceGame.UI.resetVisuals();
        },

        /**
         * Executes the physical move, handles animations, kills, and win conditions.
         */
        performMove: async function (fromId, toId, pawn) {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const UI = LudoGame.UI;
            const Audio = LudoGame.Audio;
            const Utils = LudoGame.Utils;

            try {
                // Safety Check on Paths
                const path = Config.TEAM_PATHS[pawn.team];
                const startIdx = path.indexOf(fromId);
                const endIdx = path.indexOf(toId);
                if (startIdx === -1 || endIdx === -1) return;

                // 1. Save History & UI Lock
                State.saveHistory();
                State.isAnimating = true;
                if (UI.elements.modeBtn) UI.elements.modeBtn.disabled = true;
                const pSelect = document.getElementById('player-count-select');
                if (pSelect) pSelect.disabled = true;
                if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = true;

                // 2. Remove Pawn from Old Cell
                State.boardState[fromId] = State.boardState[fromId].filter(p => p.id !== pawn.id);
                UI.renderContainer(fromId);

                // 3. Animation Path Calculation
                // If endIdx < startIdx, it means we wrapped around the loop (Gatekeeper Rule)
                let steps = [];
                if (endIdx < startIdx) {
                    const GATE_INDEX = 23;
                    const part1 = path.slice(startIdx + 1, GATE_INDEX + 1);
                    const part2 = path.slice(0, endIdx + 1);
                    steps = part1.concat(part2);
                } else {
                    steps = path.slice(startIdx + 1, endIdx + 1);
                }
                await UI.animateMove(pawn.team, fromId, steps);

                // 4. Place Pawn in New Cell
                pawn.arrival = State.globalMoveCounter++;
                State.boardState[toId].push(pawn);

                // 5. Consume Dice Roll
                if (State.selectedBankIndex > -1) {
                    State.moveBank.splice(State.selectedBankIndex, 1);
                    State.selectedBankIndex = -1;
                    if (State.moveBank.length > 0) State.selectedBankIndex = 0;
                }

                // 6. Kill Logic
                const isSpecial = Config.SPECIAL_BLOCKS.includes(toId);
                const isOff = toId === 'off-board-area';

                if (!isOff) {
                    const pawnsInDest = State.boardState[toId];
                    // Find Valid Victims (Different team, not teammate)
                    const victims = pawnsInDest.filter(p =>
                        p.id !== pawn.id &&
                        p.team !== pawn.team &&
                        !Utils.isTeammate(p.team, pawn.team)
                    );

                    if (victims.length > 0) {
                        if (isSpecial) {
                            console.log(`Kill Prevented: Safe Zone.`);
                        } else {
                            // KILL CONFIRMED!

                            // Unlock Gate for this team (and partner)
                            if (State.hasKilled) {
                                State.hasKilled[pawn.team] = true;
                                if (State.isPairMode) {
                                    const partner = Utils.getTeammate(pawn.team);
                                    State.hasKilled[partner] = true;
                                }
                            }

                            // Send victim home
                            const victim = victims.sort((a, b) => a.arrival - b.arrival)[0];
                            const home = Config.HOME_BASE_MAP[victim.team];
                            State.boardState[toId] = State.boardState[toId].filter(p => p.id !== victim.id);
                            State.boardState[home].push(victim);

                            Audio.trigger('kill');
                            State.pendingRolls++; // Bonus roll for kill
                            setTimeout(() => Audio.trigger('return'), 400);
                        }
                    }
                }

                // 7. Win Condition Logic
                if (isOff) {
                    Audio.trigger('finish');
                    const offPawns = State.boardState['off-board-area'].filter(p => p.team === pawn.team);

                    // If all 4 pawns finished...
                    if (offPawns.length === 4 && !State.finishedTeams[pawn.team]) {
                        State.finishedTeams[pawn.team] = true;

                        if (State.isPairMode) {
                            // Apply "Skip One Turn" penalty to allow partner catch up logic to reset
                            State.teamsToSkip[pawn.team] = true;

                            const partner = Utils.getTeammate(pawn.team);
                            if (State.finishedTeams[partner]) {
                                // Both partners done = GAME OVER
                                State.isGameOver = true;
                                const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                                if (!State.pairWinnerOrder.includes(pairName)) State.pairWinnerOrder.push(pairName);
                                const other = pairName === "Red/Green" ? "Blue/Yellow" : "Red/Green";
                                if (!State.pairWinnerOrder.includes(other)) State.pairWinnerOrder.push(other);
                                UI.updateWinners();
                                Audio.trigger('gameover');
                            }
                        } else {
                            // Solo Mode Win
                            State.winnersList.push(pawn.team);
                            UI.updateWinners();
                            if (State.winnersList.length === (State.activeTeams.length - 1)) {
                                State.isGameOver = true;
                                Audio.trigger('gameover');
                            }
                        }
                    }
                }

                UI.renderBoard();
                UI.renderMoveBank();

                // 8. Determine Next Step (Advance turn or Roll Again)
                if (State.pendingRolls === 0 && State.moveBank.length === 0) {
                    this.advanceTurn();
                } else {
                    UI.updateRollButtonState();
                }

            } catch (error) {
                console.error("Move Failed:", error);
                // Ensure board is consistent if crash happens
                UI.renderBoard();
            } finally {
                State.isAnimating = false;
                if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = false;
                if (UI.elements.modeBtn) UI.elements.modeBtn.disabled = false;
                UI.updateRollButtonState();
            }
        }
    };

    /* ==========================================================================
       PART 3: STARTUP SEQUENCE & EVENT LISTENERS
       ========================================================================== */

    function setupEventListeners() {
        const Core = LudoGame.Core;
        const UI = LudoGame.UI;
        const State = LudoGame.State;

        document.getElementById('undo-btn')?.addEventListener('click', () => Core.reverseLastMove());

        // Player Count Change Listener
        const pCount = document.getElementById('player-count-select');
        if (pCount) {
            pCount.addEventListener('change', () => {
                document.getElementById('reset-btn').click();
            });
        }

        // Mode Toggle (Solo vs Pair)
        document.getElementById('mode-toggle')?.addEventListener('click', () => {
            State.isPairMode = !State.isPairMode;

            const icon = document.querySelector('#mode-toggle img');
            if (icon) {
                icon.src = State.isPairMode ? 'assets/duo-icon.svg' : 'assets/solo-icon.svg';
            }

            const sel = document.getElementById('player-count-select');
            if (sel) {
                // In pair mode, we force 4 players
                if (State.isPairMode) {
                    sel.value = "4";
                    sel.disabled = true;
                } else sel.disabled = false;
            }
            document.getElementById('reset-btn').click();
        });

        // Reset Game Button
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            if (confirm("Reset Game?")) {
                LudoGame.Audio.trigger('reset');
                State.reset();
                UI.renderBoard();
                UI.updateTurn();
                UI.renderMoveBank();
                UI.hidePopup();
                UI.updateWinners();
            }
        });

        // Visibility Toggle (Hide/Show Controls)
        const visBtn = document.getElementById('visibility-btn');
        const controlsContainer = document.querySelector('.controls');

        // SVG Icons for Visibility Button
        const iconEye = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const iconEyeSlash = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path></svg>`;

        if (visBtn && controlsContainer) {
            visBtn.addEventListener('click', () => {
                const isHidden = controlsContainer.classList.toggle('hidden');

                if (isHidden) {
                    visBtn.innerHTML = iconEyeSlash;
                    visBtn.title = "Show Controls";
                } else {
                    visBtn.innerHTML = iconEye;
                    visBtn.title = "Hide Controls";
                }
            });
        }

        // Music Toggle (Controls HTML <audio> tag)
        const musicBtn = document.getElementById('music-btn');
        const bgAudio = document.getElementById('bg-music');

        if (musicBtn && bgAudio) {
            bgAudio.volume = 0.3;

            musicBtn.addEventListener('click', () => {
                if (bgAudio.paused) {
                    bgAudio.play().catch(e => console.warn("Audio play blocked:", e));
                    musicBtn.classList.add('playing');
                    musicBtn.style.opacity = "1";
                } else {
                    bgAudio.pause();
                    musicBtn.style.opacity = "0.5";
                    musicBtn.classList.remove('playing');
                }
            });
        }

        // Manual Turn Controls (Debug/Override)
        document.getElementById('prev-turn-btn')?.addEventListener('click', () => Core.manualTurnChange(-1));
        document.getElementById('next-turn-btn')?.addEventListener('click', () => Core.manualTurnChange(1));

        // Dice Roll Trigger (Now clicking the dice themselves)
        document.getElementById('dice-container')?.addEventListener('click', () => {
            // Only allow click if pending rolls exist and not currently animating
            if (LudoGame.State.pendingRolls > 0 && !LudoGame.State.isAnimating) {
                DiceGame.Core.roll();
            }
        });

        // --- CLICK-TO-MOVE LOGIC ---
        document.body.addEventListener('click', (event) => {
            if (State.isGameOver || State.isAnimating) return;

            const clickedContainer = event.target.closest('.pawn-container');
            // Ignore clicks on UI elements
            if (event.target.closest('.dice-roller') || event.target.closest('#move-bank-list')) return;

            if (!clickedContainer) return;
            const containerId = clickedContainer.id;

            // 1. Ensure we have a dice roll available
            if (State.selectedBankIndex === -1 || !State.moveBank[State.selectedBankIndex]) {
                console.warn("You must roll the dice first!");
                return;
            }

            const currentDiceValue = State.moveBank[State.selectedBankIndex];
            const teamToPlay = LudoGame.Utils.getTeamToPlay();

            // 2. ASK CORE: "Is this move valid?" (This enforces strict rules like Anchor & Gate)
            const allowedMoves = Core.getValidMoves(State.currentTurn, currentDiceValue);

            // 3. Check if the clicked cell is in the allowed list
            const validMove = allowedMoves.find(m => m.fromId === containerId && m.pawn.team === teamToPlay);

            if (!validMove) {
                console.warn("Move Invalid (Blocked by Rules or Path).");
                return;
            }

            // 4. Execute the sanctioned move
            Core.performMove(validMove.fromId, validMove.toId, validMove.pawn);
        });
    }

    // --- ROBUST INIT SEQUENCE ---
    // Retries initialization until DOM is ready
    let attempts = 0;
    const startGame = () => {
        const boardReady = LudoGame.UI.init();
        const diceReady = DiceGame.UI.init();

        if (boardReady && diceReady) {
            console.log("Game Modules Loaded.");
            LudoGame.UI.buildGrid();
            setupEventListeners();
            LudoGame.State.reset();
            setTimeout(() => LudoGame.UI.renderBoard(), 100);
        } else {
            if (attempts < 10) {
                attempts++;
                console.warn(`Waiting for DOM... (${attempts}/10)`);
                setTimeout(startGame, 100);
            } else {
                console.error("Critical Error: Game Board HTML not found.");
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startGame);
    } else {
        startGame();
    }

    // Expose Namespaces
    window.LudoGame = LudoGame;
    window.DiceGame = DiceGame;

})();