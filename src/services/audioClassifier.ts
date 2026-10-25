/**
 * @file audioClassifier.ts
 * @description Real-Time Web Audio Capture, Pre-Amplification, Circular PCM Buffering,
 * and Hybrid AI Sound Classification Service.
 *
 * How this file relates to the app's design & functionality:
 * - Acts as the "ears" of `visuan`. When a Deaf or Hard of Hearing user taps the large
 *   "Listen" button on the home screen, this service requests microphone access and
 *   constructs a custom Web Audio API processing graph:
 *     `MediaStreamSource` -> `GainNode` (software pre-amp) -> `AnalyserNode` (FFT/time data)
 *                                                          -> `ChannelSplitterNode` (Left/Right direction)
 *                                                          -> `ScriptProcessorNode` (16kHz PCM recorder)
 * - Continuously monitors the environment at 60fps (`startVisualizerLoop`). When a sound
 *   crosses the user's chosen sensitivity threshold (or matches a percussive/tonal DSP signature),
 *   it packages the latest 2.5 seconds of uncompressed 16kHz audio into a standard RIFF WAV file
 *   and sends it—along with higher-order DSP features—to `/api/classify-audio`.
 * - Also maintains a parallel WebSocket connection (`/api/live`) for low-latency streaming.
 * - Filters out mundane room tone/silence so the user's Notifications feed stays clean and
 *   only displays meaningful environmental alerts.
 */

import { DirectionCue, MicSensitivity, SoundAlert } from '../types/sound';
import { featureExtractor, HigherOrderAudioFeatures } from './audioFeatures';

/**
 * Snapshot of live microphone measurements emitted on every animation frame.
 * Used by the Settings modal to render the real-time dB meter.
 */
export interface AudioMetrics {
  /** Calibrated Sound Pressure Level estimate in decibels (20 dB quiet room to 110 dB loud alarm) */
  db: number;
  /** Raw FFT frequency bins (0..255) */
  frequencyData: Uint8Array;
  /** Raw waveform samples (0..255, where 128 is zero-crossing silence) */
  timeDomainData: Uint8Array;
  /** Spatial direction estimated from stereo microphone balance */
  estimatedDirection: DirectionCue;
  /** Higher-order DSP features (Centroid, MFCCs, Pitch, Percussive Score) */
  features?: HigherOrderAudioFeatures;
}

export type AlertCallback = (alert: SoundAlert) => void;
export type MetricsCallback = (metrics: AudioMetrics) => void;
export type StateChangeCallback = (state: 'idle' | 'listening' | 'analyzing' | 'error', message?: string) => void;

class AudioClassifierService {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private preampGainNode: GainNode | null = null;
  private ws: WebSocket | null = null;
  private isListening: boolean = false;
  private animationFrameId: number | null = null;

  /**
   * 16kHz Circular PCM Audio Ring Buffer (3.0 seconds = 48,000 Float32 samples).
   * Why a circular ring buffer?
   * Standard browser `MediaRecorder` outputs compressed WebM chunks that only contain a
   * valid container header on the *very first* chunk, causing subsequent chunks to fail decoding.
   * By continuously writing raw 16kHz PCM samples into a circular array, we can slice out
   * the most recent 2.5 seconds at any instant and encode a pristine, self-contained WAV file.
   */
  private readonly SAMPLE_RATE = 16000;
  private readonly BUFFER_SECONDS = 3.0;
  private pcmRingBuffer: Float32Array = new Float32Array(16000 * 3);
  private ringWriteIndex: number = 0;
  private samplesRecorded: number = 0;

  /** Observer sets allowing React components (`App.tsx`) to subscribe to events */
  private onAlertListeners: Set<AlertCallback> = new Set();
  private onMetricsListeners: Set<MetricsCallback> = new Set();
  private onStateChangeListeners: Set<StateChangeCallback> = new Set();

  private lastAnalysisTime: number = 0;
  private isClassifying: boolean = false;
  private micSensitivity: MicSensitivity = 'medium'; // Balanced default sensitivity

  /**
   * Updates the microphone sensitivity preset ('high' | 'medium' | 'low') at runtime.
   * Immediately adjusts the Web Audio `GainNode` multiplier so quiet or distant sounds
   * can be boosted without restarting the microphone stream.
   */
  public setSensitivity(sensitivity: MicSensitivity) {
    this.micSensitivity = sensitivity;
    if (this.preampGainNode && this.audioCtx) {
      this.preampGainNode.gain.setValueAtTime(
        sensitivity === 'high' ? 2.8 : sensitivity === 'low' ? 1.15 : 1.85,
        this.audioCtx.currentTime
      );
    }
  }

  public getSensitivity(): MicSensitivity {
    return this.micSensitivity;
  }

  /** Subscribes to newly classified sound alerts. Returns an unsubscribe cleanup function. */
  public subscribeAlert(cb: AlertCallback) {
    this.onAlertListeners.add(cb);
    return () => this.onAlertListeners.delete(cb);
  }

  /** Subscribes to 60fps decibel and spectral metrics. Returns an unsubscribe cleanup function. */
  public subscribeMetrics(cb: MetricsCallback) {
    this.onMetricsListeners.add(cb);
    return () => this.onMetricsListeners.delete(cb);
  }

  /** Subscribes to service lifecycle changes ('idle', 'listening', 'analyzing', 'error'). */
  public subscribeState(cb: StateChangeCallback) {
    this.onStateChangeListeners.add(cb);
    return () => this.onStateChangeListeners.delete(cb);
  }

  private notifyState(state: 'idle' | 'listening' | 'analyzing' | 'error', message?: string) {
    this.onStateChangeListeners.forEach((cb) => cb(state, message));
  }

  private notifyAlert(alert: SoundAlert) {
    this.onAlertListeners.forEach((cb) => cb(alert));
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Opens a WebSocket connection to `/api/live` on the Express server, which bridges
   * real-time 16kHz PCM audio to the Gemini Live API. If the WebSocket is unavailable,
   * the service seamlessly relies on its HTTP `/api/classify-audio` WAV chunk pipeline.
   */
  private connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('AudioClassifier: WebSocket live connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'alert' && data.alert) {
            const name = (data.alert.sound_name || '').toLowerCase();
            // Ignore non-events like room tone or silence so the UI stays clutter-free
            const isAmbientOnly =
              name.includes('ambient background') ||
              name === 'silence' ||
              name === 'room tone' ||
              (data.alert.urgency === 'subtle' && data.alert.sound_type === 'ambient');

            if (!isAmbientOnly) {
              const alert: SoundAlert = {
                id: data.alert.id || `live-${Date.now()}`,
                timestamp: data.alert.timestamp || Date.now(),
                sound_name: data.alert.sound_name || 'Sound Event',
                sound_type: data.alert.sound_type || 'warning',
                urgency: data.alert.urgency || 'warning',
                description: data.alert.description || 'Detected via audio stream',
                direction_cue: data.alert.direction_cue || 'center',
                confidence: data.alert.confidence ?? 0.9,
                haptic_pattern: data.alert.haptic_pattern || 'double_pulse',
              };
              this.notifyAlert(alert);
            }
          }
        } catch (e) {
          console.warn('Failed to parse WS message:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('AudioClassifier: WS error, using HTTP chunk classifier fallback', e);
      };

      this.ws.onclose = () => {
        console.log('AudioClassifier: WebSocket closed');
      };
    } catch (e) {
      console.warn('WebSocket init exception:', e);
    }
  }

  /**
   * Initializes the browser microphone and builds the Web Audio API signal processing graph.
   *
   * Key Web Audio design decisions:
   * - `echoCancellation: false` and `noiseSuppression: false` are deliberately disabled!
   *   Browser voice-call filters aggressively strip out non-speech sounds like sirens,
   *   smoke alarm beeps, and bike bells, which are the exact sounds `visuan` needs to detect.
   * - `autoGainControl: true` plus our custom `preampGainNode` helps pick up sounds played
   *   across a room or from a secondary phone/laptop during testing.
   */
  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    try {
      this.notifyState('listening');

      // 1. Request raw microphone stream without destructive voice-only noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 2, min: 1 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: this.SAMPLE_RATE });

      // Browsers require resuming AudioContext after a user gesture
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);

      // 2. Software pre-amplifier gain node to boost soft sounds, video audio, or distant cries
      this.preampGainNode = this.audioCtx.createGain();
      this.preampGainNode.gain.value =
        this.micSensitivity === 'high' ? 2.8 : this.micSensitivity === 'low' ? 1.15 : 1.85;

      source.connect(this.preampGainNode);

      // 3. Main FFT frequency & waveform analyzer (512 samples -> 256 frequency bins)
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.preampGainNode.connect(this.analyser);

      // 4. Stereo channel splitter for Left vs. Right directional estimation (when hardware supports stereo)
      try {
        const splitter = this.audioCtx.createChannelSplitter(2);
        this.leftAnalyser = this.audioCtx.createAnalyser();
        this.leftAnalyser.fftSize = 256;
        this.rightAnalyser = this.audioCtx.createAnalyser();
        this.rightAnalyser.fftSize = 256;

        this.preampGainNode.connect(splitter);
        splitter.connect(this.leftAnalyser, 0);
        splitter.connect(this.rightAnalyser, 1);
      } catch (e) {
        // Fallback to mono 'center' direction if device only has a 1-channel mic
      }

      // 5. Reset the 3-second circular PCM recording buffer
      this.pcmRingBuffer = new Float32Array(this.SAMPLE_RATE * this.BUFFER_SECONDS);
      this.ringWriteIndex = 0;
      this.samplesRecorded = 0;

      // 6. ScriptProcessor captures raw 16kHz Float32 PCM audio chunks (4096 samples per callback)
      this.scriptProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const len = channelData.length;

        // Write incoming Float32 samples into the circular ring buffer
        for (let i = 0; i < len; i++) {
          this.pcmRingBuffer[this.ringWriteIndex] = channelData[i];
          this.ringWriteIndex = (this.ringWriteIndex + 1) % this.pcmRingBuffer.length;
          this.samplesRecorded++;
        }

        // Convert Float32 (-1.0..+1.0) to 16-bit signed integer PCM (-32768..+32767)
        // and stream base64-encoded frames over WebSocket if connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const pcm16 = new Int16Array(len);
          for (let i = 0; i < len; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          const bLen = bytes.byteLength;
          for (let i = 0; i < bLen; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          this.ws.send(JSON.stringify({ type: 'audio_pcm', pcmBase64: base64 }));
        }
      };

      this.preampGainNode.connect(this.scriptProcessor);

      // Connect ScriptProcessor to a 0-gain (muted) node before `audioCtx.destination`.
      // Why? Web Audio requires ScriptProcessor to be connected to destination to fire callbacks,
      // but muting it to 0 prevents speaker feedback howling!
      const muteGain = this.audioCtx.createGain();
      muteGain.gain.value = 0;
      this.scriptProcessor.connect(muteGain);
      muteGain.connect(this.audioCtx.destination);

      // Connect WebSocket in parallel
      this.connectWebSocket();

      this.isListening = true;
      this.notifyState('listening');
      this.startVisualizerLoop();
      return true;
    } catch (err: any) {
      console.error('Failed to start audio listening:', err);
      this.notifyState('error', err?.message || 'Microphone access denied');
      return false;
    }
  }

  /**
   * Encodes raw 16kHz Float32 PCM samples into a binary-compliant 44-byte RIFF WAVE (`audio/wav`) file.
   *
   * Why build a WAV header manually?
   * Sending a complete, uncompressed 16-bit mono WAV file to Gemini ensures 100% compatibility
   * and zero codec compression artifacts on high-frequency sounds like smoke alarms and bike bells.
   */
  private encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
    // 44 bytes for standard RIFF WAV header + 2 bytes per 16-bit sample
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true); // File size - 8 bytes
    writeString(8, 'WAVE');
    // "fmt " sub-chunk (describes audio format)
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for linear PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = uncompressed PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = mono)
    view.setUint32(24, sampleRate, true); // SampleRate (16000 Hz)
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16-bit)
    // "data" sub-chunk (contains actual PCM samples)
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write clamped 16-bit signed integer samples in little-endian byte order
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Unwraps the circular `pcmRingBuffer` to return a contiguous, chronologically ordered
   * `Float32Array` of the last `seconds` (e.g., 2.5s) of audio.
   */
  private getLatestPCMWindow(seconds: number = 2.5): Float32Array {
    const windowLength = Math.min(this.pcmRingBuffer.length, Math.floor(this.SAMPLE_RATE * seconds));
    const output = new Float32Array(windowLength);

    let readIndex = (this.ringWriteIndex - windowLength + this.pcmRingBuffer.length) % this.pcmRingBuffer.length;
    for (let i = 0; i < windowLength; i++) {
      output[i] = this.pcmRingBuffer[readIndex];
      readIndex = (readIndex + 1) % this.pcmRingBuffer.length;
    }

    return output;
  }

  /**
   * 60fps monitoring loop (`requestAnimationFrame`).
   * Computes decibels, estimates spatial direction, extracts higher-order DSP features,
   * and decides whether the current acoustic activity warrants triggering an AI classification.
   */
  private startVisualizerLoop = () => {
    const loop = () => {
      if (!this.isListening || !this.analyser) return;

      const freqData = new Uint8Array(this.analyser.frequencyBinCount);
      const timeData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freqData);
      this.analyser.getByteTimeDomainData(timeData);

      // 1. Calculate Root-Mean-Square (RMS) loudness, dB SPL, and peak transient deviation
      let sum = 0;
      let maxPeak = 0;
      for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sum += val * val;
        const diff = Math.abs(timeData[i] - 128);
        if (diff > maxPeak) maxPeak = diff;
      }
      const rms = Math.sqrt(sum / timeData.length);
      // Convert linear RMS to logarithmic decibels (dB), clamped to a realistic [20..110] range
      const db = Math.max(20, Math.min(110, Math.round(20 * Math.log10(Math.max(rms, 0.001)) + 94)));

      // 2. Estimate Left / Center / Right direction by comparing stereo channel energy
      let estimatedDirection: DirectionCue = 'center';
      if (this.leftAnalyser && this.rightAnalyser) {
        const leftData = new Uint8Array(this.leftAnalyser.frequencyBinCount);
        const rightData = new Uint8Array(this.rightAnalyser.frequencyBinCount);
        this.leftAnalyser.getByteFrequencyData(leftData);
        this.rightAnalyser.getByteFrequencyData(rightData);

        const leftEnergy = leftData.reduce((a, b) => a + b, 0);
        const rightEnergy = rightData.reduce((a, b) => a + b, 0);
        const diff = leftEnergy - rightEnergy;
        const total = leftEnergy + rightEnergy || 1;

        if (diff / total > 0.22) {
          estimatedDirection = 'left';
        } else if (diff / total < -0.22) {
          estimatedDirection = 'right';
        }
      }

      // 3. Extract higher-order acoustic features (Spectral Centroid, Rolloff, Flux, MFCCs, Harmonicity)
      const rawLatest = this.getLatestPCMWindow(0.5);
      const features = featureExtractor.extractFeatures(freqData, timeData, rawLatest);

      // Broadcast live metrics to any subscribed UI components (e.g., Settings decibel meter)
      this.onMetricsListeners.forEach((cb) =>
        cb({
          db,
          frequencyData: freqData,
          timeDomainData: timeData,
          estimatedDirection,
          features,
        })
      );

      const now = Date.now();
      const timeSinceLast = now - this.lastAnalysisTime;

      // 4. Calibrated Gating Thresholds per sensitivity level:
      // - High: triggers on softer sounds (> 27 dB or waveform peak > 5)
      // - Medium (default): triggers on clear sounds (> 31 dB or waveform peak > 7)
      // - Low: triggers only on louder sounds (> 38 dB or waveform peak > 12)
      const dbThreshold = this.micSensitivity === 'high' ? 27 : this.micSensitivity === 'low' ? 38 : 31;
      const peakThreshold = this.micSensitivity === 'high' ? 5 : this.micSensitivity === 'low' ? 12 : 7;

      // Pace HTTP classification requests so the first onset triggers immediately,
      // while sustained sounds don't flood the API and trigger HTTP 429 rate limits
      const minInterval = this.micSensitivity === 'high' ? 2400 : this.micSensitivity === 'low' ? 3600 : 2800;

      // Smart acoustic signature triggers from our DSP feature extractor
      const isAcousticTarget = features.estimatedCategoryHint !== 'ambient';
      const isTransientKnock =
        features.percussiveScore > (this.micSensitivity === 'high' ? 2.8 : this.micSensitivity === 'low' ? 3.8 : 3.2) &&
        maxPeak > 6;
      const hasAudibleSound = db >= dbThreshold || maxPeak >= peakThreshold;

      // Trigger chunk analysis if enough audio (at least 0.7s) has been buffered and gates pass
      if (
        ((isAcousticTarget && timeSinceLast > 2000) ||
          (isTransientKnock && timeSinceLast > 2000) ||
          (hasAudibleSound && timeSinceLast > minInterval)) &&
        !this.isClassifying &&
        this.samplesRecorded >= this.SAMPLE_RATE * 0.7
      ) {
        this.analyzeCurrentChunk(estimatedDirection, db, features);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  };

  /**
   * Slices the latest 2.5 seconds of audio from the ring buffer, encodes it as a base64 WAV file,
   * and POSTs it along with DSP features to `/api/classify-audio`.
   */
  public async analyzeCurrentChunk(
    estimatedDirection: DirectionCue = 'center',
    currentDb: number = 60,
    extractedFeatures?: HigherOrderAudioFeatures
  ) {
    if (this.isClassifying || this.samplesRecorded < this.SAMPLE_RATE * 0.7) return;
    this.isClassifying = true;
    this.lastAnalysisTime = Date.now();
    this.notifyState('analyzing');

    try {
      // 1. Extract latest 2.5 seconds of uncompressed 16kHz audio and encode to WAV
      const samples = this.getLatestPCMWindow(2.5);
      const wavBlob = this.encodeWAV(samples, this.SAMPLE_RATE);

      // 2. Ensure we have full-window DSP features to accompany the audio
      const freqData = this.analyser ? new Uint8Array(this.analyser.frequencyBinCount) : new Uint8Array(256);
      const timeData = this.analyser ? new Uint8Array(this.analyser.frequencyBinCount) : new Uint8Array(256);
      if (this.analyser) {
        this.analyser.getByteFrequencyData(freqData);
        this.analyser.getByteTimeDomainData(timeData);
      }
      const features = extractedFeatures || featureExtractor.extractFeatures(freqData, timeData, samples);

      // 3. Convert WAV Blob into a Base64 string for JSON transport
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve(base64);
        };
      });
      reader.readAsDataURL(wavBlob);
      const base64Data = await base64Promise;

      if (!base64Data) {
        this.isClassifying = false;
        return;
      }

      // 4. Send audio + DSP telemetry to our Express backend
      const res = await fetch('/api/classify-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Data,
          mimeType: 'audio/wav',
          metadata: {
            estimatedDirection,
            decibels: currentDb,
            features: {
              spectralCentroid: features.spectralCentroid,
              spectralRolloff: features.spectralRolloff,
              spectralFlux: features.spectralFlux,
              spectralFlatness: features.spectralFlatness,
              mfcc: features.mfcc,
              percussiveScore: features.percussiveScore,
              harmonicEnergyRatio: features.harmonicEnergyRatio,
              pitchEstimate: features.pitchEstimate,
              estimatedCategoryHint: features.estimatedCategoryHint,
            },
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.alert) {
          const name = (json.alert.sound_name || '').toLowerCase();
          // Filter out ambient background/silence classifications so only real sounds notify the user
          const isAmbientOnly =
            name.includes('ambient background') ||
            name === 'silence' ||
            name === 'room tone' ||
            name === 'normal room background' ||
            (json.alert.urgency === 'subtle' && json.alert.sound_type === 'ambient');

          if (!isAmbientOnly) {
            this.notifyAlert(json.alert);
          }
        }
      }
    } catch (e) {
      console.warn('Audio classification request error:', e);
    } finally {
      this.isClassifying = false;
      if (this.isListening) {
        this.notifyState('listening');
      }
    }
  }

  /** Allows the Test Sounds modal to inject a verified alert directly into the notification pipeline */
  public emitSimulatedAlert(alert: SoundAlert) {
    this.notifyAlert(alert);
  }

  /**
   * Cleanly tears down all Web Audio nodes, stops the microphone hardware indicator light,
   * cancels the 60fps animation loop, and closes the WebSocket connection when the user clicks "Stop".
   */
  public stopListening() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.preampGainNode) {
      this.preampGainNode.disconnect();
      this.preampGainNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.samplesRecorded = 0;
    this.ringWriteIndex = 0;
    this.notifyState('idle');
  }
}

export const audioClassifier = new AudioClassifierService();
