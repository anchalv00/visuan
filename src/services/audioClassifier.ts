import { DirectionCue, MicSensitivity, SoundAlert } from '../types/sound';
import { featureExtractor, HigherOrderAudioFeatures } from './audioFeatures';

export interface AudioMetrics {
  db: number;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  estimatedDirection: DirectionCue;
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

  // 16kHz Circular PCM Audio Buffer (3.0 seconds = 48,000 samples)
  private readonly SAMPLE_RATE = 16000;
  private readonly BUFFER_SECONDS = 3.0;
  private pcmRingBuffer: Float32Array = new Float32Array(16000 * 3);
  private ringWriteIndex: number = 0;
  private samplesRecorded: number = 0;

  private onAlertListeners: Set<AlertCallback> = new Set();
  private onMetricsListeners: Set<MetricsCallback> = new Set();
  private onStateChangeListeners: Set<StateChangeCallback> = new Set();

  private lastAnalysisTime: number = 0;
  private isClassifying: boolean = false;
  private micSensitivity: MicSensitivity = 'medium'; // Balanced default sensitivity

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

  public subscribeAlert(cb: AlertCallback) {
    this.onAlertListeners.add(cb);
    return () => this.onAlertListeners.delete(cb);
  }

  public subscribeMetrics(cb: MetricsCallback) {
    this.onMetricsListeners.add(cb);
    return () => this.onMetricsListeners.delete(cb);
  }

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

  // Connects WebSocket for streaming to Gemini Live
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

  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    try {
      this.notifyState('listening');

      // Request microphone with clean audio constraints
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

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);

      // Software pre-amplifier gain node to boost soft sounds, video audio, or distant cries
      this.preampGainNode = this.audioCtx.createGain();
      this.preampGainNode.gain.value =
        this.micSensitivity === 'high' ? 2.8 : this.micSensitivity === 'low' ? 1.15 : 1.85;

      source.connect(this.preampGainNode);

      // Main frequency analyzer
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.preampGainNode.connect(this.analyser);

      // Stereo channel splitter for directional estimation if available
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
        // Fallback to mono
      }

      // Initialize circular PCM recording buffer
      this.pcmRingBuffer = new Float32Array(this.SAMPLE_RATE * this.BUFFER_SECONDS);
      this.ringWriteIndex = 0;
      this.samplesRecorded = 0;

      // ScriptProcessor captures 16kHz PCM audio
      this.scriptProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const len = channelData.length;

        for (let i = 0; i < len; i++) {
          this.pcmRingBuffer[this.ringWriteIndex] = channelData[i];
          this.ringWriteIndex = (this.ringWriteIndex + 1) % this.pcmRingBuffer.length;
          this.samplesRecorded++;
        }

        // Stream PCM to WebSocket if open
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

      // Connect to a 0-gain node before destination to prevent audio feedback and prevent Chrome howl cancellation
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

  // Encodes raw 16kHz Float32 PCM samples into a standard, complete RIFF WAV Blob
  private encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = mono)
    view.setUint32(24, sampleRate, true); // SampleRate (16000)
    view.setUint32(28, sampleRate * 2, true); // ByteRate (16000 * 1 * 2)
    view.setUint16(32, 2, true); // BlockAlign (2)
    view.setUint16(34, 16, true); // BitsPerSample (16)
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Extracts the latest audio window from the circular PCM buffer
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

  private startVisualizerLoop = () => {
    const loop = () => {
      if (!this.isListening || !this.analyser) return;

      const freqData = new Uint8Array(this.analyser.frequencyBinCount);
      const timeData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freqData);
      this.analyser.getByteTimeDomainData(timeData);

      // Calculate approximate RMS and dB, and peak transient deviation (for knocks/beeps)
      let sum = 0;
      let maxPeak = 0;
      for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sum += val * val;
        const diff = Math.abs(timeData[i] - 128);
        if (diff > maxPeak) maxPeak = diff;
      }
      const rms = Math.sqrt(sum / timeData.length);
      const db = Math.max(20, Math.min(110, Math.round(20 * Math.log10(Math.max(rms, 0.001)) + 94)));

      // Spectral energy across frequency bands:
      // Mid-band (bins 5 to 35: 300Hz-2200Hz): Siren sweeps, baby crying, human voice distress, door knocks
      // High-band (bins 36 to 85: 2200Hz-5300Hz): Smoke alarms, timers, bike bells
      let midSum = 0;
      for (let i = 5; i <= 35 && i < freqData.length; i++) {
        midSum += freqData[i];
      }
      const midEnergy = midSum / 31;

      let highSum = 0;
      for (let i = 36; i <= 85 && i < freqData.length; i++) {
        highSum += freqData[i];
      }
      const highEnergy = highSum / 50;

      // Estimate direction from stereo channel splitters
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

      // Higher-order acoustic feature extraction (Spectral Centroid, Rolloff, Flux, MFCCs, Harmonicity)
      const rawLatest = this.getLatestPCMWindow(0.5);
      const features = featureExtractor.extractFeatures(freqData, timeData, rawLatest);

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

      // Calibrated Gating Thresholds per sensitivity level:
      // High: triggers on audible sound > 27 dB or maxPeak > 5
      // Medium (default): triggers on clear sound > 31 dB or maxPeak > 7
      // Low: triggers on louder sounds > 38 dB or maxPeak > 12
      const dbThreshold = this.micSensitivity === 'high' ? 27 : this.micSensitivity === 'low' ? 38 : 31;
      const peakThreshold = this.micSensitivity === 'high' ? 5 : this.micSensitivity === 'low' ? 12 : 7;
      const minInterval = this.micSensitivity === 'high' ? 1100 : this.micSensitivity === 'low' ? 2000 : 1400;

      // Smart acoustic signature triggers
      const isAcousticTarget = features.estimatedCategoryHint !== 'ambient';
      const isTransientKnock =
        features.percussiveScore > (this.micSensitivity === 'high' ? 2.8 : this.micSensitivity === 'low' ? 3.8 : 3.2) &&
        maxPeak > 6;
      const hasAudibleSound = db >= dbThreshold || maxPeak >= peakThreshold;

      if (
        ((isAcousticTarget && timeSinceLast > 900) ||
          (isTransientKnock && timeSinceLast > 900) ||
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

  public async analyzeCurrentChunk(
    estimatedDirection: DirectionCue = 'center',
    currentDb: number = 60,
    extractedFeatures?: HigherOrderAudioFeatures
  ) {
    if (this.isClassifying || this.samplesRecorded < this.SAMPLE_RATE * 0.8) return;
    this.isClassifying = true;
    this.lastAnalysisTime = Date.now();
    this.notifyState('analyzing');

    try {
      // Extract latest 2.5 seconds of uncompressed 16kHz audio
      const samples = this.getLatestPCMWindow(2.5);
      const wavBlob = this.encodeWAV(samples, this.SAMPLE_RATE);

      // Extract fresh full-window features if not provided
      const freqData = this.analyser ? new Uint8Array(this.analyser.frequencyBinCount) : new Uint8Array(256);
      const timeData = this.analyser ? new Uint8Array(this.analyser.frequencyBinCount) : new Uint8Array(256);
      if (this.analyser) {
        this.analyser.getByteFrequencyData(freqData);
        this.analyser.getByteTimeDomainData(timeData);
      }
      const features = extractedFeatures || featureExtractor.extractFeatures(freqData, timeData, samples);

      // Convert to base64
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

  // Simulates an alert directly
  public emitSimulatedAlert(alert: SoundAlert) {
    this.notifyAlert(alert);
  }

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
