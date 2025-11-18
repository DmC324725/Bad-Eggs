(function() {
    // This IIFE (Immediately Invoked Function Expression) protects the dice roller's
    // variables from conflicting with the board game's variables.
    
    // --- PREPARE AUDIO ---
    const diceRattleSound = new Tone.MembraneSynth({
        pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
    }).toDestination();
    
    const diceLandSound = new Tone.MembraneSynth({
        pitchDecay: 0.005, octaves: 3, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
    }).toDestination();

    const specialSound12 = new Tone.Synth({
        oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 }
    }).toDestination();
    
    const crowdShaker6 = new Tone.NoiseSynth({
        noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0 }
    }).toDestination();
    
    const crowdShaker12 = new Tone.NoiseSynth({
        noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.4, sustain: 0 }
    }).toDestination();
    
    const clapSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01, octaves: 4, envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
    }).toDestination();

    // --- PREPARE VISUALS (SVGs) ---
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
    
    // --- GET DICE ROLLER DOM ELEMENTS ---
    const diceContainer = document.getElementById('dice-container');
    const diceElements = diceContainer.querySelectorAll('.dice');
    const resultDisplay = document.getElementById('result-display');
    const rollButton = document.getElementById('roll-button');
    const confettiContainer = document.getElementById('confetti-container');

    // --- DICE CONSTANTS ---
    const NUM_DICE = 6;
    const MIN_ROLL_TIME = 400; // ms
    const MAX_ROLL_TIME = 1200; // ms
    const CONFETTI_COLORS = ['confetti-yellow', 'confetti-cyan', 'confetti-pink', 'confetti-lime'];

    // --- DICE BUTTON CONTROL ---
    function disableRollButton() {
        rollButton.disabled = true;
    }

    function enableRollButton() {
        rollButton.disabled = false;
    }

    // --- CONFETTI FUNCTION ---
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

            setTimeout(() => {
                piece.style.transform = `translateY(${endY}px) rotate(${endRotation}deg)`;
                piece.style.opacity = '0';
            }, 10);

            setTimeout(() => {
                piece.remove();
            }, 2000);
        }
    }

    // --- SHARED ROLLING LOGIC ---
    function startRollAnimation(forcedRolls) {
        Tone.start().catch(e => console.warn("Tone.start failed, user must interact first."));
        disableRollButton();
        resultDisplay.innerText = '...';
        resultDisplay.classList.remove('dice-result-12', 'dice-result-6', 'dice-result-normal');
        
        const now = Tone.now();
        diceRattleSound.triggerAttackRelease("C1", "8n", now);
        diceRattleSound.triggerAttackRelease("G0", "8n", now + 0.08);
        
        diceElements.forEach(die => {
            die.innerHTML = `<div>${svgRolling}</div>`; // Wrap in div for centering
            die.classList.remove('dice-bg-0', 'dice-bg-1');
            die.classList.add('dice-bg-rolling');
        });

        let diceLandedCount = 0;
        let sum = 0;

        for (let i = 0; i < NUM_DICE; i++) {
            const roll = (forcedRolls) ? forcedRolls[i] : Math.floor(Math.random() * 2);
            
            if (forcedRolls) {
                sum += roll;
            }
            
            const duration = Math.random() * (MAX_ROLL_TIME - MIN_ROLL_TIME) + MIN_ROLL_TIME;

            setTimeout(() => {
                const dieElement = diceElements[i];
                dieElement.innerHTML = (roll === 0) ? `<div>${svgFor0}</div>` : `<div>${svgFor1}</div>`;
                dieElement.classList.remove('dice-bg-rolling');
                dieElement.classList.add(roll === 0 ? 'dice-bg-0' : 'dice-bg-1');

                diceLandSound.triggerAttackRelease("C2", "8n", Tone.now());
                diceLandedCount++;
                
                if (!forcedRolls) {
                    sum += roll;
                }

                if (diceLandedCount === NUM_DICE) {
                    calculateFinalResult(sum);
                }
            }, duration);
        }
    }

    // --- MAIN DICE FUNCTION ---
    function rollDice() {
        startRollAnimation(null);
    }

    // --- DICE AUDIO CELEBRATIONS ---
    function playCelebration6() {
        const now = Tone.now();
        resultDisplay.classList.add('dice-result-6');
        crowdShaker6.triggerAttackRelease(now);
        clapSynth.triggerAttackRelease("C3", "8n", now + 0.01);
        clapSynth.triggerAttackRelease("G2", "8n", now + 0.05);
    }

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
    
    function calculateFinalResult(currentSum) {
        const finalResult = (currentSum === 0) ? 12 : currentSum;
        resultDisplay.innerText = finalResult;
        
        if (finalResult === 12) {
            playCelebration12();
        } else if (finalResult === 6) {
            playCelebration6();
        } else {
            resultDisplay.classList.add('dice-result-normal');
        }
        
        enableRollButton();
    }

    rollButton.addEventListener('click', rollDice);
})();