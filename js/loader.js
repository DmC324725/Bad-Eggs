/**
 * loader.js
 * This script automatically loads all game scripts in the correct dependency order.
 */

(function () {
    const scripts = [
        // --- 1. DICE ROLLER MODULES ---
        "js/dice/config.js", // Config & SVGs
        "js/dice/audio.js", // Sound logic
        "js/dice/ui.js", // Visuals & DOM
        "js/dice/core.js", // Rolling logic
        "js/dice/main.js", // Listeners & Init

        // --- 2. BOARD GAME MODULES ---
        "js/game/config.js", // Constants & Paths
        "js/game/state.js", // Global Variables
        "js/game/audio.js", // Tone.js setup
        "js/game/utils.js", // Math & Helpers
        "js/game/ui.js", // Rendering & Popups
        "js/game/core.js", // Game Rules & Movement
        "js/game/main.js" // Listeners & Init
    ];

    // Loop through and inject them into the page synchronously
    scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Ensures they execute in the array order
        document.body.appendChild(script);
    });
})();