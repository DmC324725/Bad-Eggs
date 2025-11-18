// This is an IIFE (Immediately Invoked Function Expression).
// It creates a private "scope" for the dice roller, so its
// variables (like 'diceContainer') won't conflict with the 
// board game's variables.
(function () {

    // --- 1. AUDIO SETUP (using Tone.js) ---
    // Synthesizer for the "rattle" sound
    const diceRattleSound = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0
        }
    }).toDestination();

    // Synthesizer for the "land" sound
    const diceLandSound = new Tone.MembraneSynth({
        pitchDecay: 0.005,
        octaves: 3,
        envelope: {
            attack: 0.001,
            decay: 0.05,
            sustain: 0
        }
    }).toDestination();

    // Synthesizer for the "12" celebration
    const specialSound12 = new Tone.Synth({
        oscillator: {
            type: 'triangle'
        },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 0.5
        }
    }).toDestination();

    // Noise generator for the "6" celebration
    const crowdShaker6 = new Tone.NoiseSynth({
        noise: {
            type: 'white'
        },
        envelope: {
            attack: 0.005,
            decay: 0.15,
            sustain: 0
        }
    }).toDestination();

    // Noise generator for the "12" celebration
    const crowdShaker12 = new Tone.NoiseSynth({
        noise: {
            type: 'white'
        },
        envelope: {
            attack: 0.005,
            decay: 0.4,
            sustain: 0
        }
    }).toDestination();

    // Synthesizer for the percussive "clap" sounds
    const clapSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0
        }
    }).toDestination();

    // --- 2. VISUALS (SVG Strings) ---
    // These strings are used as 'innerHTML' to show the dice faces.
    const svgFor0 = `
        <svg style="width:40px; height:40px; color:#9ca3af; stroke:currentColor; stroke-width:2.5px; overflow: visible;" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    const svgFor1 = `
        <svg style="width:40px; height:40px; color:#22d3ee; overflow: visible;" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10.5" />
        </svg>
    `;
    const svgRolling = `
        <svg style="width:36px; height:36px; color:white; animation: spin 1s linear infinite; overflow: visible;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    // --- 3. DOM ELEMENTS ---
    // Get all the HTML elements this script needs to interact with.
    const diceContainer = document.getElementById('dice-container');
    const diceElements = diceContainer.querySelectorAll('.dice');
    const resultDisplay = document.getElementById('result-display');
    const rollButton = document.getElementById('roll-button');
    const confettiContainer = document.getElementById('confetti-container');

    // --- NEW: Get the reset button ---
    const resetDiceBtn = document.getElementById('reset-dice-btn');

    // --- 4. CONSTANTS ---
    const NUM_DICE = 6;
    const MIN_ROLL_TIME = 400; // ms
    const MAX_ROLL_TIME = 1200; // ms
    const CONFETTI_COLORS = ['confetti-yellow', 'confetti-cyan', 'confetti-pink', 'confetti-lime'];

    // --- 5. HELPER FUNCTIONS ---

    /** Disables the roll button (to prevent spamming) */
    function disableRollButton() {
        rollButton.disabled = true;
        rollButton.style.opacity = "0.5"; // Visual feedback
        rollButton.style.cursor = "not-allowed";
    }

    /** Enables the roll button after a roll is complete */
    function enableRollButton() {
        rollButton.disabled = false;
        rollButton.style.opacity = "1";
        rollButton.style.cursor = "pointer";
    }

    /** Creates and animates 30 confetti pieces */
    function triggerConfetti() {
        for (let i = 0; i < 30; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece ' + CONFETTI_COLORS[i % CONFETTI_COLORS.length];

            const startX = Math.random() * 100;
            const startRotation = Math.random() * 360;
            const endRotation = startRotation + (Math.random() * 360 - 180);
            const endY = 300 + Math.random() * 100;

            piece.style.left = `${startX}%`;
            piece.style.top = '-20px';
            piece.style.transform = `rotate(${startRotation}deg)`;

            confettiContainer.appendChild(piece);

            // Animate the piece
            setTimeout(() => {
                piece.style.transform = `translateY(${endY}px) rotate(${endRotation}deg)`;
                piece.style.opacity = '0';
            }, 10);

            // Remove the piece from the DOM after 2 seconds
            setTimeout(() => {
                piece.remove();
            }, 2000);
        }
    }

    /** Plays the celebration sound for rolling a 6 */
    function playCelebration6() {
        const now = Tone.now();
        resultDisplay.classList.add('dice-result-6');
        crowdShaker6.triggerAttackRelease(now);
        clapSynth.triggerAttackRelease("C3", "8n", now + 0.01);
        clapSynth.triggerAttackRelease("G2", "8n", now + 0.05);
    }

    /** Plays the celebration sound for rolling a 12 (all 0s) */
    function playCelebration12() {
        const now = Tone.now();
        resultDisplay.classList.add('dice-result-12');
        crowdShaker12.triggerAttackRelease(now);
        specialSound12.triggerAttackRelease("G5", "8n", now + 0.05);
        triggerConfetti();
        clapSynth.triggerAttackRelease("C3", "8n", now + 0.02);
        clapSynth.triggerAttackRelease("G2", "8n", now + 0.06);
        clapSynth.triggerAttackRelease("E3", "8n", now + 0.1);
        clapSynth.triggerAttackRelease("C3", "8n", now + 0.15);
        clapSynth.triggerAttackRelease("A2", "8n", now + 0.22);
    }

    /** Called after all dice have finished rolling */
    function calculateFinalResult(currentSum) {
        // A roll of all 0s (sum=0) counts as 12
        const finalResult = (currentSum === 0) ? 12 : currentSum;
        resultDisplay.innerText = finalResult;

        // Trigger special effects
        if (finalResult === 12) {
            playCelebration12();
        } else if (finalResult === 6) {
            playCelebration6();
        } else {
            resultDisplay.classList.add('dice-result-normal');
        }

        enableRollButton();
    }

    // --- 6. CORE ROLLING LOGIC ---

    /**
     * @param {Array|null} forcedRolls - An array of 6 numbers (e.g., [1,0,1,0,1,1]) or null for a random roll.
     */
    function startRollAnimation(forcedRolls) {
        // This must be called by a user click (like the 'roll' button)
        // to initialize the audio context in the browser.
        Tone.start().catch(e => console.warn("Tone.start failed, user must interact first."));

        disableRollButton();
        resultDisplay.innerText = '...';
        resultDisplay.classList.remove('dice-result-12', 'dice-result-6', 'dice-result-normal');

        // Play rattle sounds
        const now = Tone.now();
        diceRattleSound.triggerAttackRelease("C1", "8n", now);
        diceRattleSound.triggerAttackRelease("G0", "8n", now + 0.08);

        // Set all dice to the "rolling" visual
        diceElements.forEach(die => {
            die.innerHTML = `<div>${svgRolling}</div>`;
            die.classList.remove('dice-bg-0', 'dice-bg-1');
            die.classList.add('dice-bg-rolling');
        });

        let diceLandedCount = 0;
        let sum = 0;

        // Loop 6 times, once for each die
        for (let i = 0; i < NUM_DICE; i++) {
            // Use the forced roll if available, otherwise get a random 0 or 1
            const roll = (forcedRolls) ? forcedRolls[i] : Math.floor(Math.random() * 2);

            if (forcedRolls) {
                sum += roll;
            }

            // Give each die a different random roll duration
            const duration = Math.random() * (MAX_ROLL_TIME - MIN_ROLL_TIME) + MIN_ROLL_TIME;

            // Set a timeout for this specific die
            setTimeout(() => {
                const dieElement = diceElements[i];

                // Set the final face (0 or 1)
                dieElement.innerHTML = (roll === 0) ? `<div>${svgFor0}</div>` : `<div>${svgFor1}</div>`;
                dieElement.classList.remove('dice-bg-rolling');
                dieElement.classList.add(roll === 0 ? 'dice-bg-0' : 'dice-bg-1');

                // Play the "land" sound
                diceLandSound.triggerAttackRelease("C2", "8n", Tone.now());

                diceLandedCount++;

                // If this was a random roll, add to the sum
                if (!forcedRolls) {
                    sum += roll;
                }

                // If this is the *last* die to land, calculate the final total
                if (diceLandedCount === NUM_DICE) {
                    calculateFinalResult(sum);
                }
            }, duration);
        }
    }

    /** The main function called by the button */
    function rollDice() {
        startRollAnimation(null);
    }

    // --- NEW: FORCE RESET FUNCTION ---
    /** Resets the dice roller state in case it gets stuck */
    function resetDiceRoller() {
        // 1. Reset Text
        resultDisplay.innerText = '0';
        // Remove any color classes
        resultDisplay.classList.remove('dice-result-12', 'dice-result-6', 'dice-result-normal');

        // 2. Reset Dice Visuals to default (gray, 0)
        diceElements.forEach(die => {
            die.innerHTML = `<div>${svgFor0}</div>`;
            die.className = 'dice dice-bg-0';
        });

        // 3. Clear Confetti
        confettiContainer.innerHTML = '';

        // 4. FORCE ENABLE BUTTON
        enableRollButton();

        console.log("Dice roller manually reset.");
    }

    // --- 7. EVENT LISTENERS ---
    rollButton.addEventListener('click', rollDice);

    // Add listener for the new reset button
    if (resetDiceBtn) {
        resetDiceBtn.addEventListener('click', resetDiceRoller);
    }

})(); // End of the dice roller's private scope