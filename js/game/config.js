/**
 * config.js
 * Defines the LudoGame namespace and holds static constants.
 * These values never change during gameplay.
 */

window.LudoGame = window.LudoGame || {};

(function () {
    LudoGame.Config = {
        // Grid dimensions
        ROWS: 7,
        COLS: 7,

        // Mapping of team names to their starting home cell ID
        HOME_BASE_MAP: {
            'red': 'cell-0-3',
            'blue': 'cell-3-0',
            'green': 'cell-6-3',
            'yellow': 'cell-3-6'
        },

        // List of "Safe" cells where pawns cannot be killed
        SPECIAL_BLOCKS: [
            'cell-0-3', // Red Home
            'cell-3-0', // Blue Home
            'cell-6-3', // Green Home
            'cell-3-6', // Yellow Home
            'cell-3-3' // Center Home
        ],

        // The standard sequence of play
        TURN_ORDER: ['red', 'blue', 'green', 'yellow'],

        // Visual hex codes for the turn display UI
        TEAM_COLORS: {
            'red': '#e53935',
            'blue': '#1e88e5',
            'green': '#43a047',
            'yellow': '#fdd835'
        },

        // Pre-calculated paths for each team (0-indexed)
        // Maps movement from start to 'off-board-area'
        TEAM_PATHS: {
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
        }
    };
})();