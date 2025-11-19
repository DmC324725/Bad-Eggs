/**
 * audio.js
 * Handles sound generation using Tone.js
 */

window.LudoGame = window.LudoGame || {};

(function () {
    // Synths
    const moveSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0
        }
    }).toDestination();
    const killSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0
        }
    }).toDestination();
    const successSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: "triangle"
        },
        envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.1,
            release: 1
        }
    }).toDestination();
    const resetSynth = new Tone.NoiseSynth({
        noise: {
            type: 'pink'
        },
        envelope: {
            attack: 0.01,
            decay: 0.3,
            sustain: 0
        }
    }).toDestination();

    LudoGame.Audio = {
        trigger: function (type) {
            // Browser audio context policy check
            if (Tone.context.state !== 'running') {
                Tone.start().catch(e => console.warn(e));
            }

            const now = Tone.now();
            switch (type) {
                case 'move':
                    moveSynth.triggerAttackRelease("C5", "8n", now);
                    break;
                case 'kill':
                    killSynth.triggerAttackRelease("G2", "8n", now);
                    break;
                case 'return':
                    moveSynth.triggerAttackRelease("A3", "16n", now);
                    moveSynth.triggerAttackRelease("E3", "16n", now + 0.1);
                    break;
                case 'finish':
                    successSynth.triggerAttackRelease(["C5", "E5", "G5"], "8n", now);
                    break;
                case 'gameover':
                    successSynth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1n", now);
                    break;
                case 'reset':
                    resetSynth.triggerAttackRelease("8n", now);
                    break;
            }
        }
    };
})();