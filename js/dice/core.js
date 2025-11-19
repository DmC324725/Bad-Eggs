/**
 * core.js
 * Handles the game logic loop, random generation, and orchestration.
 */

 window.DiceGame = window.DiceGame || {};

 DiceGame.Core = {
     roll: function(forcedRolls = null) {
         // Initialize Audio
         DiceGame.Audio.init();
         
         // UI Setup
         DiceGame.UI.toggleButton(false);
         DiceGame.UI.setResult('...');
         DiceGame.UI.setDieLoading();
         DiceGame.Audio.playRattle();
 
         let diceLandedCount = 0;
         let sum = 0;
         const config = DiceGame.Config;
 
         // Roll each die individually
         for (let i = 0; i < config.NUM_DICE; i++) {
             const result = (forcedRolls) ? forcedRolls[i] : Math.floor(Math.random() * 2);
             
             // Add to sum immediately if forced, or accumulate later
             if (forcedRolls) sum += result;
 
             // Random duration for each die
             const duration = Math.random() * (config.MAX_ROLL_TIME - config.MIN_ROLL_TIME) + config.MIN_ROLL_TIME;
 
             setTimeout(() => {
                 // Update visual
                 DiceGame.UI.updateDieFace(i, result);
                 DiceGame.Audio.playLand();
                 
                 diceLandedCount++;
                 
                 if (!forcedRolls) sum += result;
 
                 // Check if all dice have landed
                 if (diceLandedCount === config.NUM_DICE) {
                     DiceGame.Core.finalizeRoll(sum);
                 }
             }, duration);
         }
     },
 
     finalizeRoll: function(total) {
         // Rule: All 0s counts as 12
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
         DiceGame.UI.toggleButton(true);
     }
 };