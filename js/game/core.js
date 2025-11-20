/**
 * core.js
 * The "Brain" of the game. Orchestrates State, UI, and Logic.
 */

window.LudoGame = window.LudoGame || {};

(function () {
    // Shorthand references to other modules
    // Note: We access them inside functions to ensure they are loaded

    LudoGame.Core = {

        /** Selects a pawn when user clicks a cell */
        selectCell: function (cell) {
            const State = LudoGame.State;
            const Utils = LudoGame.Utils;
            const UI = LudoGame.UI;

            const id = cell.id;
            if (id === 'off-board-area') return;

            const pawns = State.boardState[id];
            const teamToPlay = Utils.getTeamToPlay();

            // FIFO: Select oldest pawn
            const validPawn = pawns.filter(p => p.team === teamToPlay)
                .sort((a, b) => a.arrival - b.arrival)[0];

            if (validPawn) {
                this.clearSelection();
                State.selectedPawnInfo = {
                    fromContainerId: id,
                    pawn: validPawn
                };

                // Visuals
                UI.renderContainer(id); // Update to show shimmer
                UI.highlightPath(teamToPlay, id);
            }
        },

        clearSelection: function () {
            const State = LudoGame.State;
            const UI = LudoGame.UI;

            if (State.selectedPawnInfo) {
                const oldId = State.selectedPawnInfo.fromContainerId;
                State.selectedPawnInfo = null;
                UI.renderContainer(oldId); // Remove shimmer
            }
            UI.clearHighlights();
        },

        /** Calculates next turn based on rules */
        advanceTurn: function () {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const UI = LudoGame.UI;

            if (State.isGameOver) return;

            do {
                // Handle Reversal
                if (State.isTurnOrderReversed) {
                    State.turnIndex = (State.turnIndex - 1 + Config.TURN_ORDER.length) % Config.TURN_ORDER.length;
                } else {
                    State.turnIndex = (State.turnIndex + 1) % Config.TURN_ORDER.length;
                }

                const next = Config.TURN_ORDER[State.turnIndex];

                if (State.isPairMode && State.teamsToSkip[next]) {
                    State.teamsToSkip[next] = false; // Use skip
                    console.log(next + " skipped");
                } else if (!State.isPairMode && State.finishedTeams[next]) {
                    continue; // Skip forever
                } else {
                    break; // Valid
                }
            } while (true);

            State.currentTurn = Config.TURN_ORDER[State.turnIndex];
            UI.updateTurn();
        },

        /** Reverses the last move by restoring state */
        reverseLastMove: function () {
            const State = LudoGame.State;
            const UI = LudoGame.UI;
            const Audio = LudoGame.Audio;

            if (State.isAnimating) return; // Don't undo while moving

            const success = State.undo();
            if (success) {
                console.log("Move reversed.");

                // Refresh UI
                UI.renderBoard();
                UI.updateTurn();
                UI.updateWinners();

                // Clear any selection to prevent weird states
                this.clearSelection();
                UI.hidePopup();

                // Play a sound (using 'return' sound for feedback)
                Audio.trigger('return');
            } else {
                console.log("No moves to undo.");
            }
        },

        /** Handles manual previous/next buttons */
        manualTurnChange: function (offset) {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const UI = LudoGame.UI;

            if (State.isGameOver) return;
            this.clearSelection();
            UI.hidePopup();

            let idx = State.turnIndex;
            let safety = 0;
            do {
                idx = (idx + offset + Config.TURN_ORDER.length) % Config.TURN_ORDER.length;
                const next = Config.TURN_ORDER[idx];
                if (!State.isPairMode && State.finishedTeams[next]) {
                    safety++;
                    if (safety > 4) break;
                    continue;
                }
                break;
            } while (true);

            State.turnIndex = idx;
            State.currentTurn = Config.TURN_ORDER[idx];
            UI.updateTurn();
        },

        /** * The Big One: Execute Move, Animate, Kill, Check Win 
         * Updated with Try/Catch for robustness
         */
        performMove: async function (fromId, toId, pawn) {
            const State = LudoGame.State;
            const Config = LudoGame.Config;
            const UI = LudoGame.UI;
            const Audio = LudoGame.Audio;
            const Utils = LudoGame.Utils;

            try {
                // 1. SAVE HISTORY (New)
                State.saveHistory();

                // 2. Lock Board
                State.isAnimating = true;
                UI.elements.modeBtn.disabled = true;
                const pSelect = document.getElementById('player-count-select');
                if (pSelect) pSelect.disabled = true;
                if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = true;

                // 3. Calculate Path
                const path = Config.TEAM_PATHS[pawn.team];
                const startIdx = path.indexOf(fromId);
                const endIdx = path.indexOf(toId);
                const steps = path.slice(startIdx + 1, endIdx + 1);

                // 4. Visual Move (Start)
                State.boardState[fromId] = State.boardState[fromId].filter(p => p.id !== pawn.id);
                UI.renderContainer(fromId);

                // 5. Animate
                await UI.animateMove(pawn.team, fromId, steps);

                // 6. Update Data (End)
                pawn.arrival = State.globalMoveCounter++;
                State.boardState[toId].push(pawn);

                // 7. Kill Logic
                const isSpecial = Config.SPECIAL_BLOCKS.includes(toId);
                const isOff = toId === 'off-board-area';

                // FIX: Use 'isSpecial', not 'isSafe'
                if (!isSpecial && !isOff) {
                    const pawnsInDest = State.boardState[toId];
                    const victims = pawnsInDest.filter(p => p.team !== pawn.team && !Utils.isTeammate(p.team, pawn.team));

                    if (victims.length > 0) {
                        const victim = victims.sort((a, b) => a.arrival - b.arrival)[0];
                        const home = Config.HOME_BASE_MAP[victim.team];

                        State.boardState[toId] = State.boardState[toId].filter(p => p.id !== victim.id);
                        State.boardState[home].push(victim);

                        Audio.trigger('kill');
                        setTimeout(() => Audio.trigger('return'), 400);
                    }
                }

                // 8. Win Logic
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
                            const totalPlayers = State.activeTeams.length; // Use active players count
                            if (State.winnersList.length === totalPlayers - 1) {
                                State.isGameOver = true;
                                const last = Config.TURN_ORDER.find(t => State.activeTeams.includes(t) && !State.finishedTeams[t]);
                                if (last) {
                                    State.winnersList.push(last);
                                    State.finishedTeams[last] = true;
                                    UI.updateWinners();
                                }
                                Audio.trigger('gameover');
                            }
                        }
                    }
                }

                // 9. Unlock & Render
                UI.renderBoard();

                if (State.isGameOver) {
                    console.log("Game Over");
                } else {
                    // CHANGE: Always auto-advance turn immediately
                    this.advanceTurn();
                }

            } catch (error) {
                console.error("Move Failed:", error);
                UI.renderBoard();
            } finally {
                State.isAnimating = false;
                if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = false;
            }
        }
    };
})();