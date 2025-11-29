/**
 * ROBUST GAME BUNDLE (Final Fix)
 * ------------------------------
 * Issues Fixed:
 * 1. "Stuck at Start": Added a retry-loop that waits for HTML elements to exist.
 * 2. "Empty Board": Forces a double-render on startup to ensure pawns appear.
 * 3. Audio & Animation safety checks included.
 */

(function() {
    "use strict";

    // Initialize Namespaces
    window.LudoGame = window.LudoGame || {};
    window.DiceGame = window.DiceGame || {};

    /* ==========================================================================
       PART 1: DICE GAME (THE GENERATOR)
       ========================================================================== */

    DiceGame.Config = {
        NUM_DICE: 6,
        MIN_ROLL_TIME: 400,
        MAX_ROLL_TIME: 1200,
        CONFETTI_COLORS: ['confetti-yellow', 'confetti-cyan', 'confetti-pink', 'confetti-lime']
    };

    DiceGame.SVGs = {
        face0: `<svg style="width:40px; height:40px; color:#9ca3af; stroke:currentColor; stroke-width:2.5px; overflow: visible;" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
        face1: `<svg style="width:40px; height:40px; color:#22d3ee; overflow: visible;" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" /></svg>`,
        rolling: `<svg style="width:36px; height:36px; color:white; animation: spin 1s linear infinite; overflow: visible;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`
    };

    // --- DICE AUDIO ---
    let diceSynths = null;
    function getDiceSynths() {
        if (diceSynths) return diceSynths;
        try {
            if (window.Tone) {
                diceSynths = {
                    rattle: new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination(),
                    land: new Tone.MembraneSynth({ pitchDecay: 0.005, octaves: 3, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).toDestination(),
                    special: new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 } }).toDestination(),
                    shaker6: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0 } }).toDestination(),
                    shaker12: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.4, sustain: 0 } }).toDestination(),
                    clap: new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 4, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination()
                };
            }
        } catch(e) { console.warn("Audio init failed", e); }
        return diceSynths;
    }

    DiceGame.Audio = {
        init: function() { try { if(window.Tone && Tone.context.state !== 'running') Tone.start().catch(() => {}); getDiceSynths(); } catch(e) {} },
        playRattle: function() { try { const s = getDiceSynths(); if(s) { s.rattle.triggerAttackRelease("C1", "8n", Tone.now()); s.rattle.triggerAttackRelease("G0", "8n", Tone.now() + 0.08); } } catch(e) {} },
        playLand: function() { try { const s = getDiceSynths(); if(s) s.land.triggerAttackRelease("C2", "8n", Tone.now()); } catch(e) {} },
        playCelebration6: function() { try { const s = getDiceSynths(); if(s) { s.shaker6.triggerAttackRelease(Tone.now()); s.clap.triggerAttackRelease("C3", "8n", Tone.now() + 0.01); } } catch(e) {} },
        playCelebration12: function() { try { const s = getDiceSynths(); if(s) { s.shaker12.triggerAttackRelease(Tone.now()); s.special.triggerAttackRelease("G5", "8n", Tone.now() + 0.05); } } catch(e) {} }
    };

    // --- DICE UI ---
    DiceGame.UI = {
        elements: {},
        init: function() {
            this.elements = {
                container: document.getElementById('dice-container'),
                dice: document.querySelectorAll('.dice'),
                display: document.getElementById('result-display'),
                btn: document.getElementById('roll-button'),
                resetBtn: document.getElementById('reset-dice-btn'),
                confetti: document.getElementById('confetti-container')
            };
            return !!this.elements.btn; // Return true if button exists
        },
        setResult: function(text, classType) {
            if(!this.elements.display) return;
            this.elements.display.innerText = text;
            this.elements.display.className = '';
            if (classType) this.elements.display.classList.add(classType);
        },
        resetVisuals: function() {
            if(!this.elements.display) return;
            this.elements.display.innerText = '0';
            this.elements.display.className = '';
            if(this.elements.dice) {
                this.elements.dice.forEach(die => {
                    die.innerHTML = `<div>${DiceGame.SVGs.face0}</div>`;
                    die.className = 'dice dice-bg-0';
                });
            }
            if(this.elements.confetti) this.elements.confetti.innerHTML = '';
        },
        setDieLoading: function() {
            if(!this.elements.dice) return;
            this.elements.dice.forEach(die => {
                die.innerHTML = `<div>${DiceGame.SVGs.rolling}</div>`;
                die.className = 'dice dice-bg-rolling';
            });
        },
        updateDieFace: function(index, value) {
            if(!this.elements.dice || !this.elements.dice[index]) return;
            const die = this.elements.dice[index];
            if (value === 0) {
                die.innerHTML = `<div>${DiceGame.SVGs.face0}</div>`;
                die.className = 'dice dice-bg-0';
            } else {
                die.innerHTML = `<div>${DiceGame.SVGs.face1}</div>`;
                die.className = 'dice dice-bg-1';
            }
        },
        triggerConfetti: function() {
            if(!this.elements.confetti) return;
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

    // --- DICE CORE ---
    DiceGame.Core = {
        roll: function(forcedRolls = null) {
            if (window.LudoGame.State.pendingRolls <= 0 || window.LudoGame.State.isAnimating) return;

            DiceGame.Audio.init();
            DiceGame.UI.setResult('...');
            DiceGame.UI.setDieLoading();
            DiceGame.Audio.playRattle();

            // Disable button directly to prevent double clicks
            const btn = document.getElementById('roll-button');
            if(btn) btn.disabled = true;

            let diceLandedCount = 0;
            let sum = 0;
            const config = DiceGame.Config;
            let finished = false;

            // Safety timeout
            setTimeout(() => {
                if(!finished) {
                    finished = true;
                    DiceGame.Core.finalizeRoll(sum > 0 ? sum : 4);
                }
            }, 2500);

            for (let i = 0; i < config.NUM_DICE; i++) {
                const result = (forcedRolls) ? forcedRolls[i] : Math.floor(Math.random() * 2);
                if (forcedRolls) sum += result;
                const duration = Math.random() * (config.MAX_ROLL_TIME - config.MIN_ROLL_TIME) + config.MIN_ROLL_TIME;

                setTimeout(() => {
                    if(finished) return;
                    DiceGame.UI.updateDieFace(i, result);
                    DiceGame.Audio.playLand();
                    diceLandedCount++;
                    if (!forcedRolls) sum += result;
                    if (diceLandedCount === config.NUM_DICE) {
                        finished = true;
                        DiceGame.Core.finalizeRoll(sum);
                    }
                }, duration);
            }
        },

        finalizeRoll: function(total) {
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
            if (window.LudoGame && window.LudoGame.Core) {
                window.LudoGame.Core.onDiceRolled(finalScore);
            }
        }
    };

    /* ==========================================================================
       PART 2: LUDO GAME
       ========================================================================== */

    LudoGame.Config = {
        ROWS: 7,
        COLS: 7,
        HOME_BASE_MAP: { 'red': 'cell-0-3', 'blue': 'cell-3-0', 'green': 'cell-6-3', 'yellow': 'cell-3-6' },
        SPECIAL_BLOCKS: ['cell-0-3', 'cell-3-0', 'cell-6-3', 'cell-3-6', 'cell-3-3'],
        TURN_ORDER: ['red', 'blue', 'green', 'yellow'],
        TEAM_COLORS: { 'red': '#e53935', 'blue': '#1e88e5', 'green': '#43a047', 'yellow': '#fdd835' },
        TEAM_PATHS: {
            'red': ['cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-3-3', 'off-board-area'],
            'blue': ['cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-3-3', 'cell-3-2', 'cell-3-3', 'off-board-area'],
            'green': ['cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-4-4', 'cell-4-3', 'cell-3-3', 'off-board-area'],
            'yellow': ['cell-3-6', 'cell-2-6', 'cell-1-6', 'cell-0-6', 'cell-0-5', 'cell-0-4', 'cell-0-3', 'cell-0-2', 'cell-0-1', 'cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-3-0', 'cell-4-0', 'cell-5-0', 'cell-6-0', 'cell-6-1', 'cell-6-2', 'cell-6-3', 'cell-6-4', 'cell-6-5', 'cell-6-6', 'cell-5-6', 'cell-4-6', 'cell-5-5', 'cell-5-4', 'cell-5-3', 'cell-5-2', 'cell-5-1', 'cell-4-1', 'cell-3-1', 'cell-2-1', 'cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4', 'cell-1-5', 'cell-2-5', 'cell-3-5', 'cell-4-5', 'cell-4-4', 'cell-4-3', 'cell-4-2', 'cell-3-2', 'cell-2-2', 'cell-2-3', 'cell-2-4', 'cell-3-4', 'cell-3-3', 'off-board-area']
        }
    };

    LudoGame.State = {
        isPairMode: false,
        selectedPawnInfo: null,
        globalMoveCounter: 0,
        boardState: {},
        turnIndex: 0,
        currentTurn: 'red',
        tempDestinationId: null,
        finishedTeams: { 'red': false, 'blue': false, 'green': false, 'yellow': false },
        teamsToSkip: { 'red': false, 'blue': false, 'green': false, 'yellow': false },
        winnersList: [],
        pairWinnerOrder: [],
        isGameOver: false,
        isAnimating: false,
        isTurnOrderReversed: false,
        moveBank: [], 
        selectedBankIndex: -1,
        pendingRolls: 1, 
        moveHistory: [],

        saveHistory: function() {
            this.moveHistory.push(JSON.parse(JSON.stringify({
                boardState: this.boardState,
                finishedTeams: this.finishedTeams,
                teamsToSkip: this.teamsToSkip,
                winnersList: this.winnersList,
                pairWinnerOrder: this.pairWinnerOrder,
                globalMoveCounter: this.globalMoveCounter,
                turnIndex: this.turnIndex,
                currentTurn: this.currentTurn,
                isGameOver: this.isGameOver,
                moveBank: this.moveBank,
                pendingRolls: this.pendingRolls
            })));
        },
        undo: function() {
            if (this.moveHistory.length === 0) return false;
            Object.assign(this, this.moveHistory.pop());
            return true;
        },
        reset: function() {
            this.globalMoveCounter = 0;
            this.boardState = {};
            this.moveHistory = [];
            this.moveBank = [];
            this.selectedBankIndex = -1;
            this.pendingRolls = 1;

            const Config = LudoGame.Config;
            for (let r = 0; r < Config.ROWS; r++) {
                for (let c = 0; c < Config.COLS; c++) this.boardState[`cell-${r}-${c}`] = [];
            }
            this.boardState['off-board-area'] = [];

            ['red', 'blue', 'green', 'yellow'].forEach(team => {
                const home = Config.HOME_BASE_MAP[team];
                for (let i = 0; i < 4; i++) {
                    this.boardState[home].push({ id: `${team[0]}${i}`, team: team, arrival: this.globalMoveCounter++ });
                }
            });

            this.finishedTeams = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
            this.teamsToSkip = { 'red': false, 'blue': false, 'green': false, 'yellow': false };
            this.winnersList = [];
            this.pairWinnerOrder = [];
            this.isGameOver = false;
            this.isAnimating = false;
            this.isTurnOrderReversed = false;
            this.selectedPawnInfo = null;
            this.turnIndex = 0;
            this.currentTurn = Config.TURN_ORDER[0];
            
            // Sync Dice UI
            DiceGame.UI.resetVisuals();
            LudoGame.UI.updateRollButtonState();
        }
    };

    // --- BOARD AUDIO ---
    let boardSynths = null;
    function getBoardSynths() {
        if(boardSynths) return boardSynths;
        try {
            if(window.Tone) {
                boardSynths = {
                    move: new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination(),
                    kill: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination(),
                    success: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 1 } }).toDestination(),
                    reset: new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0 } }).toDestination()
                };
            }
        } catch(e) { console.warn("Board audio init failed", e); }
        return boardSynths;
    }

    LudoGame.Audio = {
        trigger: function(type) {
            try {
                if (window.Tone && Tone.context.state !== 'running') Tone.start().catch(() => {});
                const s = getBoardSynths();
                if(!s) return;
                const now = Tone.now();
                switch (type) {
                    case 'move': s.move.triggerAttackRelease("C5", "8n", now); break;
                    case 'kill': s.kill.triggerAttackRelease("G2", "8n", now); break;
                    case 'return': s.move.triggerAttackRelease("A3", "16n", now); s.move.triggerAttackRelease("E3", "16n", now + 0.1); break;
                    case 'finish': s.success.triggerAttackRelease(["C5", "E5", "G5"], "8n", now); break;
                    case 'gameover': s.success.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1n", now); break;
                    case 'reset': s.reset.triggerAttackRelease("8n", now); break;
                }
            } catch(e) {}
        }
    };

    LudoGame.Utils = {
        isTeammate: function(t1, t2) {
            if (!LudoGame.State.isPairMode || t1 === t2) return false;
            if ((t1 === 'red' && t2 === 'green') || (t1 === 'green' && t2 === 'red')) return true;
            if ((t1 === 'blue' && t2 === 'yellow') || (t1 === 'yellow' && t2 === 'blue')) return true;
            return false;
        },
        getTeammate: function(t) {
            if (t === 'red') return 'green'; if (t === 'green') return 'red';
            if (t === 'blue') return 'yellow'; if (t === 'yellow') return 'blue';
            return null;
        },
        getTeamToPlay: function() {
            const current = LudoGame.State.currentTurn;
            if (!LudoGame.State.isPairMode || !LudoGame.State.finishedTeams[current]) return current;
            return this.getTeammate(current);
        },
        distFromCenter: function(r, c) { return Math.max(Math.abs(r - 3), Math.abs(c - 3)); }
    };

    LudoGame.UI = {
        elements: {},
        init: function() {
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
            return !!this.elements.board; // Return true if board exists
        },
        buildGrid: function() {
            if (!this.elements.board) {
                // Try to find it one last time
                this.elements.board = document.getElementById('game-board');
                if(!this.elements.board) return;
            }
            
            const { ROWS, COLS, HOME_BASE_MAP } = LudoGame.Config;
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
                    if (HOME_BASE_MAP['red'] === cell.id) cell.classList.add('home-red');
                    if (HOME_BASE_MAP['blue'] === cell.id) cell.classList.add('home-blue');
                    if (HOME_BASE_MAP['green'] === cell.id) cell.classList.add('home-green');
                    if (HOME_BASE_MAP['yellow'] === cell.id) cell.classList.add('home-yellow');
                }
            }
        },
        createPawn: function(team, count) {
            const stack = document.createElement('div');
            stack.classList.add('pawn-stack', `pawn-stack-${team}`);
            stack.dataset.team = team;
            const counter = document.createElement('div');
            counter.classList.add('pawn-counter');
            counter.innerText = count;
            stack.appendChild(counter);
            return stack;
        },
        renderContainer: function(id) {
            const container = document.getElementById(id);
            if (!container) return;
            const pawns = LudoGame.State.boardState[id];
            const selected = LudoGame.State.selectedPawnInfo;
            if (id === 'off-board-area') container.querySelectorAll('.pawn-stack').forEach(el => el.remove());
            else container.innerHTML = '';
            const groups = {};
            if (pawns) pawns.forEach(p => { groups[p.team] = (groups[p.team] || 0) + 1; });
            for (const team in groups) {
                const el = this.createPawn(team, groups[team]);
                container.appendChild(el);
                if (selected && selected.fromContainerId === id && selected.pawn.team === team) {
                    el.classList.add('selected-pawn');
                }
            }
        },
        renderBoard: function() {
            if(!this.elements.board) return;
            for (const id in LudoGame.State.boardState) this.renderContainer(id);
        },
        renderMoveBank: function() {
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
                    if(LudoGame.State.selectedPawnInfo) {
                        const info = LudoGame.State.selectedPawnInfo;
                        LudoGame.UI.clearHighlights();
                        LudoGame.UI.highlightPath(info.pawn.team, info.fromContainerId);
                    }
                });
                bankList.appendChild(btn);
            });
            if (bank.length > 0) bankDisplay.classList.remove('hidden');
            else bankDisplay.classList.add('hidden');
        },
        updateRollButtonState: function() {
            const btn = document.getElementById('roll-button');
            if (!btn) return;
            // Force re-enable if logic says so
            const canRoll = LudoGame.State.pendingRolls > 0 && !LudoGame.State.isGameOver && !LudoGame.State.isAnimating;
            btn.disabled = !canRoll;
            btn.style.opacity = canRoll ? "1" : "0.5";
            btn.innerText = canRoll ? "Roll Dice" : (LudoGame.State.moveBank.length > 0 ? "Move Pawn" : "Wait");
        },
        updateTurn: function() {
            if(!this.elements.turnDisplay) return;
            const turn = LudoGame.State.currentTurn;
            this.elements.turnDisplay.innerText = turn.toUpperCase();
            this.elements.turnDisplay.style.backgroundColor = LudoGame.Config.TEAM_COLORS[turn];
            if(this.elements.board) {
                this.elements.board.classList.remove('board-turn-red', 'board-turn-blue', 'board-turn-green', 'board-turn-yellow');
                this.elements.board.classList.add(`board-turn-${turn}`);
            }
        },
        updateWinners: function() {
            if(!this.elements.winnersList) return;
            this.elements.winnersList.innerHTML = '';
            const list = LudoGame.State.isPairMode ? LudoGame.State.pairWinnerOrder : LudoGame.State.winnersList;
            list.forEach((name, i) => {
                const li = document.createElement('li');
                li.innerText = `${i + 1}: ${name.toUpperCase()}`;
                this.elements.winnersList.appendChild(li);
            });
        },
        highlightPath: function(team, startId) {
            const path = LudoGame.Config.TEAM_PATHS[team];
            const idx = path.indexOf(startId);
            if (idx === -1) return;
            let limit = 12;
            if(LudoGame.State.selectedBankIndex > -1) {
                limit = LudoGame.State.moveBank[LudoGame.State.selectedBankIndex];
            }
            const nextSteps = path.slice(idx + 1, idx + 1 + limit);
            nextSteps.forEach((cellId, i) => {
                const cell = document.getElementById(cellId);
                if (cell) {
                    cell.classList.add('path-highlight', `path-highlight-${team}`);
                    cell.style.animationDelay = `${i * 0.1}s`;
                }
            });
        },
        clearHighlights: function() {
            document.querySelectorAll('.path-highlight').forEach(el => {
                el.className = el.className.replace(/path-highlight.*/, '').trim();
                el.style.animationDelay = '0s';
            });
        },
        showPopup: function(cell, showSelect) {
            if(!this.elements.popup) return;
            const r1 = cell.getBoundingClientRect();
            const r2 = this.elements.wrapper.getBoundingClientRect();
            this.elements.popup.style.top = `${r1.top - r2.top}px`;
            this.elements.popup.style.left = `${r1.left - r2.left + r1.width + 5}px`;
            this.elements.selectBtn.classList.toggle('hidden', !showSelect);
            this.elements.popup.classList.remove('hidden');
            cell.classList.add('target-cell');
        },
        hidePopup: function() {
            if(!this.elements.popup) return;
            this.elements.popup.classList.add('hidden');
            if (LudoGame.State.tempDestinationId) {
                const cell = document.getElementById(LudoGame.State.tempDestinationId);
                if (cell) cell.classList.remove('target-cell');
            }
        },
        showPostMove: function() {
            if(!this.elements.modal) return;
            this.elements.modal.classList.remove('hidden');
            this.elements.postPopup.classList.remove('hidden');
        },
        hidePostMove: function() {
            if(!this.elements.modal) return;
            this.elements.modal.classList.add('hidden');
            this.elements.postPopup.classList.add('hidden');
        },
        getCoords: function(el) {
            const r1 = this.elements.wrapper.getBoundingClientRect();
            const r2 = el.getBoundingClientRect();
            return { x: (r2.left - r1.left) + (r2.width / 2) - 13, y: (r2.top - r1.top) + (r2.height / 2) - 13 };
        },
        animateMove: async function(team, startId, steps) {
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

    LudoGame.Core = {
        onDiceRolled: function(score) {
            const State = LudoGame.State;
            State.moveBank.push(score);
            State.pendingRolls--; 
            State.selectedBankIndex = State.moveBank.length - 1;
            LudoGame.UI.renderMoveBank();
            LudoGame.UI.updateRollButtonState();
        },
        selectCell: function(cell) {
            const State = LudoGame.State;
            const Utils = LudoGame.Utils;
            const UI = LudoGame.UI;
            const id = cell.id;
            if (id === 'off-board-area') return;
            const pawns = State.boardState[id];
            const teamToPlay = Utils.getTeamToPlay();
            const validPawn = pawns.filter(p => p.team === teamToPlay).sort((a, b) => a.arrival - b.arrival)[0];
            if (validPawn) {
                this.clearSelection();
                State.selectedPawnInfo = { fromContainerId: id, pawn: validPawn };
                UI.renderContainer(id);
                UI.highlightPath(teamToPlay, id);
            }
        },
        clearSelection: function() {
            const State = LudoGame.State;
            const UI = LudoGame.UI;
            if (State.selectedPawnInfo) {
                const oldId = State.selectedPawnInfo.fromContainerId;
                State.selectedPawnInfo = null;
                UI.renderContainer(oldId);
            }
            UI.clearHighlights();
        },
        advanceTurn: function() {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const UI = LudoGame.UI;
            if (State.isGameOver) return;
            do {
                if (State.isTurnOrderReversed) State.turnIndex = (State.turnIndex - 1 + Config.TURN_ORDER.length) % Config.TURN_ORDER.length;
                else State.turnIndex = (State.turnIndex + 1) % Config.TURN_ORDER.length;
                const next = Config.TURN_ORDER[State.turnIndex];
                if (State.isPairMode && State.teamsToSkip[next]) State.teamsToSkip[next] = false;
                else if (!State.isPairMode && State.finishedTeams[next]) continue;
                else break;
            } while (true);
            State.currentTurn = Config.TURN_ORDER[State.turnIndex];
            State.moveBank = [];
            State.selectedBankIndex = -1;
            State.pendingRolls = 1;
            UI.updateTurn();
            UI.renderMoveBank();
            UI.updateRollButtonState();
            DiceGame.UI.resetVisuals();
        },
        reverseLastMove: function() {
            const State = LudoGame.State;
            const UI = LudoGame.UI;
            if (State.isAnimating) return;
            if (State.undo()) {
                UI.renderBoard();
                UI.updateTurn();
                UI.updateWinners();
                UI.renderMoveBank(); 
                UI.updateRollButtonState();
                this.clearSelection();
                UI.hidePopup();
                LudoGame.Audio.trigger('return');
            }
        },
        manualTurnChange: function(offset) {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            if (State.isGameOver) return;
            this.clearSelection();
            LudoGame.UI.hidePopup();
            let idx = State.turnIndex;
            let safety = 0;
            do {
                idx = (idx + offset + Config.TURN_ORDER.length) % Config.TURN_ORDER.length;
                const next = Config.TURN_ORDER[idx];
                if (!State.isPairMode && State.finishedTeams[next]) {
                    safety++; if (safety > 4) break;
                    continue;
                }
                break;
            } while (true);
            State.turnIndex = idx;
            State.currentTurn = Config.TURN_ORDER[idx];
            State.moveBank = [];
            State.pendingRolls = 1;
            LudoGame.UI.updateTurn();
            LudoGame.UI.renderMoveBank();
            LudoGame.UI.updateRollButtonState();
            DiceGame.UI.resetVisuals();
        },
        performMove: async function(fromId, toId, pawn) {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const UI = LudoGame.UI;
            const Audio = LudoGame.Audio;
            const Utils = LudoGame.Utils;

            try {
                State.saveHistory();
                State.isAnimating = true;
                if(UI.elements.modeBtn) UI.elements.modeBtn.disabled = true;
                const pSelect = document.getElementById('player-count-select');
                if (pSelect) pSelect.disabled = true;
                if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = true;

                // Visual Move
                State.boardState[fromId] = State.boardState[fromId].filter(p => p.id !== pawn.id);
                UI.renderContainer(fromId);

                // Animate
                const path = Config.TEAM_PATHS[pawn.team];
                const startIdx = path.indexOf(fromId);
                const endIdx = path.indexOf(toId);
                const steps = path.slice(startIdx + 1, endIdx + 1);
                await UI.animateMove(pawn.team, fromId, steps);

                // Update Data
                pawn.arrival = State.globalMoveCounter++;
                State.boardState[toId].push(pawn);

                // Consume Move
                if (State.selectedBankIndex > -1) {
                    State.moveBank.splice(State.selectedBankIndex, 1);
                    State.selectedBankIndex = -1;
                    if(State.moveBank.length > 0) State.selectedBankIndex = 0;
                }

                // Kill Logic
                const isSpecial = Config.SPECIAL_BLOCKS.includes(toId);
                const isOff = toId === 'off-board-area';
                if (!isSpecial && !isOff) {
                    const pawnsInDest = State.boardState[toId];
                    const victims = pawnsInDest.filter(p => p.team !== pawn.team && !Utils.isTeammate(p.team, pawn.team));
                    if (victims.length > 0) {
                        const victim = victims.sort((a, b) => a.arrival - b.arrival)[0];
                        const home = Config.HOME_BASE_MAP[victim.team];
                        State.boardState[toId] = State.boardState[toId].filter(p => p.id !== victim.id);
                        State.boardState[home].push(victim);
                        Audio.trigger('kill');
                        State.pendingRolls++;
                        setTimeout(() => Audio.trigger('return'), 400);
                    }
                }

                // Win Logic
                if (isOff) {
                    Audio.trigger('finish');
                    const offPawns = State.boardState['off-board-area'].filter(p => p.team === pawn.team);
                    if (offPawns.length === 4 && !State.finishedTeams[pawn.team]) {
                        State.finishedTeams[pawn.team] = true;
                        if (State.isPairMode) {
                            State.teamsToSkip[pawn.team] = true;
                            const partner = Utils.getTeammate(pawn.team);
                            if (State.finishedTeams[partner]) {
                                State.isGameOver = true;
                                const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                                if (!State.pairWinnerOrder.includes(pairName)) State.pairWinnerOrder.push(pairName);
                                const other = pairName === "Red/Green" ? "Blue/Yellow" : "Red/Green";
                                if (!State.pairWinnerOrder.includes(other)) State.pairWinnerOrder.push(other);
                                UI.updateWinners();
                                Audio.trigger('gameover');
                            }
                        } else {
                            State.winnersList.push(pawn.team);
                            UI.updateWinners();
                            if (State.winnersList.length === (Object.keys(Config.TEAM_COLORS).length - 1)) {
                                State.isGameOver = true;
                                Audio.trigger('gameover');
                            }
                        }
                    }
                }

                UI.renderBoard();
                UI.renderMoveBank();

                // Turn Logic
                if (State.pendingRolls === 0 && State.moveBank.length === 0) {
                    this.advanceTurn();
                } else {
                    UI.updateRollButtonState();
                }

            } catch (error) {
                console.error("Move Failed:", error);
                UI.renderBoard();
            } finally {
                State.isAnimating = false;
                if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = false;
                if(UI.elements.modeBtn) UI.elements.modeBtn.disabled = false;
            }
        }
    };

    /* ==========================================================================
       PART 3: STARTUP SEQUENCE (Corrected for Race Conditions)
       ========================================================================== */
    
    function setupEventListeners() {
        const Core = LudoGame.Core;
        const UI = LudoGame.UI;
        const State = LudoGame.State;
        
        document.getElementById('undo-btn')?.addEventListener('click', () => Core.reverseLastMove());
        document.getElementById('mode-toggle')?.addEventListener('click', () => {
            State.isPairMode = !State.isPairMode;
            UI.elements.modeDisplay.innerText = State.isPairMode ? 'Team Mode' : 'Solo Mode';
            const sel = document.getElementById('player-count-select');
            if(sel) {
                if(State.isPairMode) { sel.value = "4"; sel.disabled = true; }
                else sel.disabled = false;
            }
            document.getElementById('reset-btn').click();
        });
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            if (confirm("Reset Game?")) {
                LudoGame.Audio.trigger('reset');
                State.reset();
                UI.renderBoard();
                UI.updateTurn();
                UI.renderMoveBank();
                Core.clearSelection();
                UI.hidePopup();
                UI.updateWinners();
            }
        });
        
        document.getElementById('popup-move')?.addEventListener('click', () => {
            if (State.selectedPawnInfo && State.tempDestinationId) {
                const { fromContainerId, pawn } = State.selectedPawnInfo;
                Core.clearSelection();
                UI.hidePopup();
                Core.performMove(fromContainerId, State.tempDestinationId, pawn);
            }
        });
        document.getElementById('popup-select-instead')?.addEventListener('click', () => {
            if (State.tempDestinationId) {
                const newId = State.tempDestinationId;
                UI.hidePopup();
                Core.clearSelection();
                Core.selectCell(document.getElementById(newId));
            }
        });
        document.getElementById('popup-cancel')?.addEventListener('click', () => UI.hidePopup());
        
        document.getElementById('prev-turn-btn')?.addEventListener('click', () => Core.manualTurnChange(-1));
        document.getElementById('next-turn-btn')?.addEventListener('click', () => Core.manualTurnChange(1));

        document.getElementById('roll-button')?.addEventListener('click', () => {
            DiceGame.Core.roll();
        });
        
        document.body.addEventListener('click', (event) => {
            if (State.isGameOver || State.isAnimating) return;
            const clickedContainer = event.target.closest('.pawn-container');
            if (event.target.closest('.dice-roller') || event.target.closest('#popup-menu') || event.target.closest('#move-bank-list')) return;
            
            if (!clickedContainer) return;
            const containerId = clickedContainer.id;

            if (!State.selectedPawnInfo) {
                UI.hidePopup();
                const teamToPlay = LudoGame.Utils.getTeamToPlay();
                const hasPawn = State.boardState[containerId].some(p => p.team === teamToPlay);
                if (hasPawn) Core.selectCell(clickedContainer);
            } else {
                const fromId = State.selectedPawnInfo.fromContainerId;
                if (fromId === containerId) {
                    Core.clearSelection();
                    UI.hidePopup();
                    return;
                }
                if (State.tempDestinationId) {
                    const old = document.getElementById(State.tempDestinationId);
                    if (old) old.classList.remove('target-cell');
                }
                
                if(State.selectedBankIndex === -1 || !State.moveBank[State.selectedBankIndex]) {
                    console.warn("You must roll the dice first!");
                    return; 
                }

                const team = State.selectedPawnInfo.pawn.team;
                const path = LudoGame.Config.TEAM_PATHS[team];
                const start = path.indexOf(fromId);
                const end = path.indexOf(containerId);
                const steps = end - start;
                const moveVal = State.moveBank[State.selectedBankIndex];
                
                if (end === -1 || steps !== moveVal) return; 

                State.tempDestinationId = containerId;
                let showSelect = false;
                if (containerId !== 'off-board-area') {
                    const teamToPlay = LudoGame.Utils.getTeamToPlay();
                    showSelect = State.boardState[containerId].some(p => p.team === teamToPlay);
                }
                UI.showPopup(clickedContainer, showSelect);
            }
        });
    }

    // --- ROBUST INIT SEQUENCE ---
    // Retries 10 times (every 100ms) to find the HTML elements before giving up
    let attempts = 0;
    const startGame = () => {
        const boardReady = LudoGame.UI.init();
        const diceReady = DiceGame.UI.init(); // Also checks for button

        if (boardReady && diceReady) {
            console.log("Game Modules Loaded.");
            LudoGame.UI.buildGrid();
            setupEventListeners();
            LudoGame.State.reset();
            // Force a double render to ensure pawns appear
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
    
    // Expose
    window.LudoGame = LudoGame;
    window.DiceGame = DiceGame;
    
})();