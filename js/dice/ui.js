/**
 * ui.js
 * Handles DOM elements, updates, and visual effects like confetti.
 */

 window.DiceGame = window.DiceGame || {};

 (function() {
     // Cache DOM elements
     const elements = {
         container: document.getElementById('dice-container'),
         dice: document.querySelectorAll('.dice'),
         display: document.getElementById('result-display'),
         btn: document.getElementById('roll-button'),
         resetBtn: document.getElementById('reset-dice-btn'),
         confetti: document.getElementById('confetti-container')
     };
 
     DiceGame.UI = {
         // Expose elements if needed
         elements: elements,
 
         toggleButton: function(enabled) {
             if (enabled) {
                 elements.btn.disabled = false;
                 elements.btn.style.opacity = "1";
             } else {
                 elements.btn.disabled = true;
                 elements.btn.style.opacity = "0.5";
             }
         },
 
         setResult: function(text, classType) {
             elements.display.innerText = text;
             elements.display.className = ''; // Clear previous
             if (classType) elements.display.classList.add(classType);
         },
 
         resetVisuals: function() {
             elements.display.innerText = '0';
             elements.display.className = '';
             elements.dice.forEach(die => {
                 die.innerHTML = `<div>${DiceGame.SVGs.face0}</div>`;
                 die.className = 'dice dice-bg-0';
             });
             elements.confetti.innerHTML = '';
             this.toggleButton(true);
         },
 
         setDieLoading: function() {
             elements.dice.forEach(die => {
                 die.innerHTML = `<div>${DiceGame.SVGs.rolling}</div>`;
                 die.className = 'dice dice-bg-rolling';
             });
         },
 
         updateDieFace: function(index, value) {
             const die = elements.dice[index];
             if (value === 0) {
                 die.innerHTML = `<div>${DiceGame.SVGs.face0}</div>`;
                 die.className = 'dice dice-bg-0';
             } else {
                 die.innerHTML = `<div>${DiceGame.SVGs.face1}</div>`;
                 die.className = 'dice dice-bg-1';
             }
         },
 
         triggerConfetti: function() {
             const colors = DiceGame.Config.CONFETTI_COLORS;
             for (let i = 0; i < 30; i++) {
                 const piece = document.createElement('div');
                 piece.className = 'confetti-piece ' + colors[i % colors.length];
                 
                 const startX = Math.random() * 100;
                 const startRotation = Math.random() * 360;
                 const endY = 300 + Math.random() * 100;
                 
                 piece.style.left = `${startX}%`;
                 piece.style.top = '-20px';
                 piece.style.transform = `rotate(${startRotation}deg)`;
                 
                 elements.confetti.appendChild(piece);
 
                 setTimeout(() => {
                     piece.style.transform = `translateY(${endY}px) rotate(${startRotation}deg)`;
                     piece.style.opacity = '0';
                 }, 10);
                 
                 setTimeout(() => piece.remove(), 2000);
             }
         }
     };
 })();