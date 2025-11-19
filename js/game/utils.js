/**
 * utils.js
 * Helper functions for logic calculations.
 */

window.LudoGame = window.LudoGame || {};

(function () {
    LudoGame.Utils = {
        /** Checks if two teams are partners in Pair Mode */
        isTeammate: function (team1, team2) {
            if (!LudoGame.State.isPairMode || team1 === team2) return false;
            if ((team1 === 'red' && team2 === 'green') || (team1 === 'green' && team2 === 'red')) return true;
            if ((team1 === 'blue' && team2 === 'yellow') || (team1 === 'yellow' && team2 === 'blue')) return true;
            return false;
        },

        /** Returns the partner team color */
        getTeammate: function (team) {
            if (team === 'red') return 'green';
            if (team === 'green') return 'red';
            if (team === 'blue') return 'yellow';
            if (team === 'yellow') return 'blue';
            return null;
        },

        /** * Determines which team color the current player can control.
         * Handles the rule where a finished player controls their partner.
         */
        getTeamToPlay: function () {
            const current = LudoGame.State.currentTurn;
            if (!LudoGame.State.isPairMode || !LudoGame.State.finishedTeams[current]) {
                return current;
            }
            return this.getTeammate(current);
        },

        /** Calculates 2D distance for layer styling */
        distFromCenter: function (r, c) {
            return Math.max(Math.abs(r - 3), Math.abs(c - 3));
        }
    };
})();