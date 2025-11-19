/**
 * audio.js
 * Handles all sound synthesis for the dice roller.
 */

 window.DiceGame = window.DiceGame || {};

 (function() {
     // Private Synths (Not exposed globally)
     const diceRattleSound = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
     const diceLandSound = new Tone.MembraneSynth({ pitchDecay: 0.005, octaves: 3, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).toDestination();
     const specialSound12 = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 } }).toDestination();
     const crowdShaker6 = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0 } }).toDestination();
     const crowdShaker12 = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.4, sustain: 0 } }).toDestination();
     const clapSynth = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 4, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
 
     // Public Audio Methods
     DiceGame.Audio = {
         init: function() {
             // Safe start for audio context
             Tone.start().catch(e => console.warn("Tone.js start failed:", e));
         },
 
         playRattle: function() {
             const now = Tone.now();
             diceRattleSound.triggerAttackRelease("C1", "8n", now);
             diceRattleSound.triggerAttackRelease("G0", "8n", now + 0.08);
         },
 
         playLand: function() {
             diceLandSound.triggerAttackRelease("C2", "8n", Tone.now());
         },
 
         playCelebration6: function() {
             const now = Tone.now();
             crowdShaker6.triggerAttackRelease(now);
             clapSynth.triggerAttackRelease("C3", "8n", now + 0.01);
             clapSynth.triggerAttackRelease("G2", "8n", now + 0.05);
         },
 
         playCelebration12: function() {
             const now = Tone.now();
             crowdShaker12.triggerAttackRelease(now);
             specialSound12.triggerAttackRelease("G5", "8n", now + 0.05);
             
             // Clap sequence
             clapSynth.triggerAttackRelease("C3", "8n", now + 0.02);
             clapSynth.triggerAttackRelease("G2", "8n", now + 0.06);
             clapSynth.triggerAttackRelease("E3", "8n", now + 0.1);
             clapSynth.triggerAttackRelease("C3", "8n", now + 0.15);
             clapSynth.triggerAttackRelease("A2", "8n", now + 0.22);
         }
     };
 })();