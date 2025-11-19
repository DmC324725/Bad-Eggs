/**
 * core.js
 * The "Brain" of the game. Orchestrates State, UI, and Logic.
 */

window.LudoGame = window.LudoGame || {};

(function () {
    const State = LudoGame.State;
    const Config = LudoGame.Config;
    const UI = LudoGame.UI;
    const Audio = LudoGame.Audio;
    const Utils = LudoGame.Utils;

    LudoGame.Core = {

        /** Selects a pawn when user clicks a cell */
        selectCell: function (cell) {
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
            if (State.selectedPawnInfo) {
                const oldId = State.selectedPawnInfo.fromContainerId;
                State.selectedPawnInfo = null;
                UI.renderContainer(oldId); // Remove shimmer
            }
            UI.clearHighlights();
        },

        /** Calculates next turn based on rules */
        advanceTurn: function () {
            if (State.isGameOver) return;

            do {
                State.turnIndex = (State.turnIndex + 1) % Config.TURN_ORDER.length;
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

        /** Handles manual previous/next buttons */
        manualTurnChange: function (offset) {
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

        /** The Big One: Execute Move, Animate, Kill, Check Win */
        performMove: async function (fromId, toId, pawn) {
            // Lock
            State.isAnimating = true;
            UI.elements.modeBtn.disabled = true;
            if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = true;

            // Path
            const path = Config.TEAM_PATHS[pawn.team];
            const startIdx = path.indexOf(fromId);
            const endIdx = path.indexOf(toId);
            const steps = path.slice(startIdx + 1, endIdx + 1);

            // Visual Move (Start)
            // Remove from start stack data immediately for visual logic
            State.boardState[fromId] = State.boardState[fromId].filter(p => p.id !== pawn.id);
            UI.renderContainer(fromId);

            // Animate
            await UI.animateMove(pawn.team, fromId, steps);

            // Update Data (End)
            pawn.arrival = State.globalMoveCounter++;
            State.boardState[toId].push(pawn);

            // Logic
            let didFinishTurn = false;
            const isSafe = Config.SPECIAL_BLOCKS.includes(toId);
            const isOff = toId === 'off-board-area';

            // Kill?
            if (!isSafe && !isOff) {
                const destPawns = State.boardState[toId];
                const victims = destPawns.filter(p => p.team !== pawn.team && !Utils.isTeammate(p.team, pawn.team));

                if (victims.length > 0) {
                    const victim = victims.sort((a, b) => a.arrival - b.arrival)[0];
                    const home = Config.HOME_BASE_MAP[victim.team];

                    State.boardState[toId] = State.boardState[toId].filter(p => p.id !== victim.id);
                    State.boardState[home].push(victim);

                    Audio.trigger('kill');
                    setTimeout(() => Audio.trigger('return'), 400);
                }
            }

            // Win?
            if (isOff) {
                Audio.trigger('finish');
                // Check if team done
                const offPawns = State.boardState['off-board-area'].filter(p => p.team === pawn.team);

                if (offPawns.length === 4 && !State.finishedTeams[pawn.team]) {
                    didFinishThisTurn = true; // Flag to auto-end turn
                    State.finishedTeams[pawn.team] = true;

                    // Win Logic (Pair vs Solo)
                    if (State.isPairMode) {
                        State.teamsToSkip[pawn.team] = true;
                        const partner = Utils.getTeammate(pawn.team);
                        if (State.finishedTeams[partner]) {
                            State.isGameOver = true;
                            // Add both to winners
                            const pairName = (pawn.team === 'red' || pawn.team === 'green') ? "Red/Green" : "Blue/Yellow";
                            if (!State.pairWinnerOrder.includes(pairName)) State.pairWinnerOrder.push(pairName);
                            // Add other pair as 2nd
                            const other = pairName === "Red/Green" ? "Blue/Yellow" : "Red/Green";
                            if (!State.pairWinnerOrder.includes(other)) State.pairWinnerOrder.push(other);

                            UI.updateWinners();
                            Audio.trigger('gameover');
                        }
                    } else {
                        State.winnersList.push(pawn.team);
                        UI.updateWinners();
                        if (State.winnersList.length === 3) {
                            State.isGameOver = true;
                            const last = Config.TURN_ORDER.find(t => !State.finishedTeams[t]);
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

            // Unlock & Render
            UI.renderBoard();
            State.isAnimating = false;
            if (UI.elements.popupMoveBtn) UI.elements.popupMoveBtn.disabled = false;

            if (State.isGameOver) {
                console.log("Game Over");
            } else if (didFinishTurn) {
                this.advanceTurn();
            } else {
                UI.showPostMove();
            }
        }
    };
})();