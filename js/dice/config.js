/**
 * config.js
 * Defines the DiceGame namespace and static configuration.
 */

// Initialize the Namespace
window.DiceGame = window.DiceGame || {};

// Configuration Constants
DiceGame.Config = {
    NUM_DICE: 6,
    MIN_ROLL_TIME: 400, // ms
    MAX_ROLL_TIME: 1200, // ms
    CONFETTI_COLORS: ['confetti-yellow', 'confetti-cyan', 'confetti-pink', 'confetti-lime']
};

// SVG Assets (Stored as strings)
DiceGame.SVGs = {
    face0: `
        <svg style="width:40px; height:40px; color:#9ca3af; stroke:currentColor; stroke-width:2.5px; overflow: visible;" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>`,
    
    face1: `
        <svg style="width:40px; height:40px; color:#22d3ee; overflow: visible;" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10.5" />
        </svg>`,
    
    rolling: `
        <svg style="width:36px; height:36px; color:white; animation: spin 1s linear infinite; overflow: visible;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>`
};