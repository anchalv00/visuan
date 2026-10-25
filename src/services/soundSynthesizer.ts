/**
 * @file soundSynthesizer.ts
 * @description Pure Web Audio API Procedural Sound Synthesizer.
 *
 * How this file relates to the app's design & functionality:
 * - Powers the "Test Sounds" modal on the active listening screen.
 * - Instead of relying on external MP3 files that could fail to load or require network
 *   bandwidth, this module synthesizes 10+ realistic environmental sounds (Sirens, Smoke Alarms,
 *   Baby Crying, Door Knocks, Bicycle Bells, Kitchen Timers, Car Horns, Doorbells) in real time
 *   using mathematical waveforms (`OscillatorNode`), amplitude envelopes (`GainNode`), and
 *   frequency filters (`BiquadFilterNode`).
 * - Allows judges, testers, and users to audibly play target sounds and immediately verify
 *   how `visuan` formats notifications and triggers haptic feedback.
 */

let audioCtx: AudioContext | null = null;

/**
 * Lazily initializes and returns a shared browser `AudioContext` for sound synthesis.
 * Automatically resumes the context if the browser suspended it prior to user interaction.
 */
const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Plays a synthesized environmental sound matching the given `presetId`.
 * Returns a Promise that resolves once the acoustic envelope finishes playing.
 *
 * @param presetId Identifier of the acoustic recipe (e.g., 'siren', 'smoke_alarm', 'baby_cry', 'door_knock')
 */
export const playSyntheticSound = (presetId: string): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      switch (presetId) {
        case 'smoke_alarm': {
          // Standard NFPA 72 T3 Temporal Pattern:
          // Three piercing 3,100 Hz square-wave beeps (0.45s on, 0.2s off).
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(3100, now);

          gain.gain.setValueAtTime(0, now);
          // Pulse 1
          gain.gain.setValueAtTime(0.3, now + 0.05);
          gain.gain.setValueAtTime(0, now + 0.5);
          // Pulse 2
          gain.gain.setValueAtTime(0.3, now + 0.7);
          gain.gain.setValueAtTime(0, now + 1.15);
          // Pulse 3
          gain.gain.setValueAtTime(0.3, now + 1.35);
          gain.gain.setValueAtTime(0, now + 1.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.0);
          setTimeout(resolve, 2000);
          break;
        }

        case 'door_knock': {
          // 3 heavy wooden door knocks spaced 280ms apart:
          // Simulated using a triangle oscillator that rapidly pitches down from 140Hz -> 45Hz
          // over 120ms to mimic the resonant thud of knuckles striking a hollow wooden door.
          [0, 0.28, 0.56].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now + delay);
            osc.frequency.exponentialRampToValueAtTime(45, now + delay + 0.12);

            gain.gain.setValueAtTime(0.7, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.15);
          });
          setTimeout(resolve, 800);
          break;
        }

        case 'dog_growl': {
          // Deep guttural rumble using a low sawtooth wave (85–110 Hz) frequency-modulated
          // by an 18 Hz Low-Frequency Oscillator (LFO) to create a throat-vibration texture.
          const osc = ctx.createOscillator();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const mainGain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(85, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.8);
          osc.frequency.linearRampToValueAtTime(80, now + 1.8);

          lfo.frequency.setValueAtTime(18, now);
          lfoGain.gain.setValueAtTime(35, now);

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          mainGain.gain.setValueAtTime(0, now);
          mainGain.gain.linearRampToValueAtTime(0.35, now + 0.2);
          mainGain.gain.linearRampToValueAtTime(0.4, now + 1.2);
          mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

          osc.connect(mainGain);
          mainGain.connect(ctx.destination);

          lfo.start(now);
          osc.start(now);
          lfo.stop(now + 2.0);
          osc.stop(now + 2.0);
          setTimeout(resolve, 2000);
          break;
        }

        case 'car_horn': {
          // Dual-tone automotive horn blast:
          // Real car horns combine two slightly dissonant sawtooth frequencies (420 Hz & 510 Hz)
          // so the sound cuts through street traffic.
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.setValueAtTime(420, now);
          osc2.frequency.setValueAtTime(510, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
          gain.gain.setValueAtTime(0.3, now + 0.9);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.15);
          osc2.stop(now + 1.15);
          setTimeout(resolve, 1200);
          break;
        }

        case 'baby_cry': {
          // Infant distress cry:
          // Sweeps a harmonic triangle wave across the 450 Hz – 800 Hz vocal fundamental band,
          // matching the characteristic pitch contour of a crying baby.
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(750, now + 0.4);
          osc.frequency.exponentialRampToValueAtTime(500, now + 0.9);
          osc.frequency.exponentialRampToValueAtTime(800, now + 1.4);
          osc.frequency.exponentialRampToValueAtTime(400, now + 1.9);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.28, now + 0.3);
          gain.gain.setValueAtTime(0.25, now + 1.4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.0);
          setTimeout(resolve, 2000);
          break;
        }

        case 'doorbell': {
          // Classic two-tone "Ding-Dong" front door chime:
          // First chime strikes at 660 Hz (E5), followed 450ms later by 520 Hz (C5) with a warm sine decay.
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(660, now);
          gain1.gain.setValueAtTime(0.4, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(520, now + 0.45);
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.setValueAtTime(0.45, now + 0.45);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);

          osc1.start(now);
          osc1.stop(now + 0.95);
          osc2.start(now + 0.45);
          osc2.stop(now + 1.85);
          setTimeout(resolve, 1900);
          break;
        }

        case 'glass_shatter': {
          // White noise buffer passed through a 3,200 Hz high-pass filter to simulate
          // the bright, sharp crash of breaking glass shards.
          const bufferSize = ctx.sampleRate * 0.8;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(3200, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + 0.8);
          setTimeout(resolve, 800);
          break;
        }

        case 'applause': {
          // Amplitude-modulated noise passed through a 1,400 Hz bandpass filter.
          const bufferSize = ctx.sampleRate * 1.8;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.05);
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.Q.setValueAtTime(1.5, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
          gain.gain.linearRampToValueAtTime(0.3, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + 1.8);
          setTimeout(resolve, 1800);
          break;
        }

        case 'kettle_boil': {
          // Rising sine wave whistle from 1,800 Hz up to 2,600 Hz.
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.linearRampToValueAtTime(2600, now + 1.6);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.35, now + 1.0);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.8);
          setTimeout(resolve, 1800);
          break;
        }

        case 'siren': {
          // Emergency Vehicle Wail Siren:
          // Continuous sawtooth wave sweeping up and down between 650 Hz and 950 Hz.
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.linearRampToValueAtTime(950, now + 0.7);
          osc.frequency.linearRampToValueAtTime(650, now + 1.4);
          osc.frequency.linearRampToValueAtTime(950, now + 2.1);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 2.2);
          setTimeout(resolve, 2200);
          break;
        }

        case 'siren_two_tone': {
          // Hi-Lo Two-Tone Emergency Siren:
          // Alternates every 450ms between 587 Hz (D5) and 440 Hz (A4).
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.25, now);

          [0, 0.45, 0.9, 1.35].forEach((offset, idx) => {
            const freq = idx % 2 === 0 ? 587 : 440;
            osc.frequency.setValueAtTime(freq, now + offset);
          });
          gain.gain.setValueAtTime(0.25, now + 1.8);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.95);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.0);
          setTimeout(resolve, 2000);
          break;
        }

        case 'bike_bell': {
          // High-frequency metallic handlebar bicycle bell:
          // Two rapid bright pings at 2,600 Hz and 3,180 Hz with a ringing exponential decay.
          [0, 0.28].forEach((offset, idx) => {
            const freq = idx === 0 ? 2600 : 3180;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + offset);

            gain.gain.setValueAtTime(0.4, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.65);
          });
          setTimeout(resolve, 1000);
          break;
        }

        case 'timer': {
          // Kitchen Appliance / Microwave Timer:
          // Three crisp 2,800 Hz sine-wave beeps spaced 350ms apart.
          [0, 0.35, 0.7].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2800, now + offset);

            gain.gain.setValueAtTime(0.3, now + offset);
            gain.gain.setValueAtTime(0.3, now + offset + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.22);
          });
          setTimeout(resolve, 1100);
          break;
        }

        case 'security_alarm': {
          // Rapidly alternating square-wave intrusion alarm jumping between 1,200 Hz and 800 Hz.
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          gain.gain.setValueAtTime(0.2, now);

          for (let i = 0; i < 6; i++) {
            const f = i % 2 === 0 ? 1200 : 800;
            osc.frequency.setValueAtTime(f, now + i * 0.25);
          }
          gain.gain.setValueAtTime(0.2, now + 1.4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.6);
          setTimeout(resolve, 1600);
          break;
        }

        default:
          resolve();
      }
    } catch (e) {
      console.warn('Synthesizer error:', e);
      resolve();
    }
  });
};
