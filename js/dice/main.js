/**
 * main.js
 * Entry point for the Dice Roller. Attaches event listeners.
 */

 (function() {
    const ui = DiceGame.UI.elements;

    // Roll Button Listener
    if (ui.btn) {
        ui.btn.addEventListener('click', () => {
            DiceGame.Core.roll(null);
        });
    }

    // Reset Button Listener
    if (ui.resetBtn) {
        ui.resetBtn.addEventListener('click', () => {
            DiceGame.UI.resetVisuals();
            console.log("Dice roller manually reset.");
        });
    }
})();