import { DirectionCue, SoundAlert } from '../types/sound';

export interface AudioMetrics {
  db: number;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  estimatedDirection: DirectionCue;
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
  private ws: WebSocket | null = null;
  private isListening: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animationFrameId: number | null = null;

  private onAlertListeners: Set<AlertCallback> = new Set();
  private onMetricsListeners: Set<MetricsCallback> = new Set();
  private onStateChangeListeners: Set<StateChangeCallback> = new Set();

  private lastAnalysisTime: number = 0;
  private isClassifying: boolean = false;
  private baselineDb: number = 30;

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
            const alert: SoundAlert = {
              id: data.alert.id || `live-${Date.now()}`,
              timestamp: data.alert.timestamp || Date.now(),
              sound_name: data.alert.sound_name || 'Ambient Sound',
              sound_type: data.alert.sound_type || 'safety',
              urgency: data.alert.urgency || 'warning',
              description: data.alert.description || 'Detected via Gemini Live',
              direction_cue: data.alert.direction_cue || 'center',
              confidence: data.alert.confidence ?? 0.9,
              haptic_pattern: data.alert.haptic_pattern || 'double_pulse',
            };
            this.notifyAlert(alert);
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
      this.notifyState('listening', 'Requesting microphone permission...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.mediaStream = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 16000 });

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);

      // Main frequency analyzer
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;

      // Stereo channel splitter for directional estimation
      const splitter = this.audioCtx.createChannelSplitter(2);
      this.leftAnalyser = this.audioCtx.createAnalyser();
      this.leftAnalyser.fftSize = 256;
      this.rightAnalyser = this.audioCtx.createAnalyser();
      this.rightAnalyser.fftSize = 256;

      source.connect(this.analyser);
      source.connect(splitter);
      splitter.connect(this.leftAnalyser, 0);
      splitter.connect(this.rightAnalyser, 1);

      // Connect WebSocket to server for live PCM streaming
      this.connectWebSocket();

      // ScriptProcessor for PCM streaming to WebSocket
      this.scriptProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioCtx.destination);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to 16-bit PCM little-endian
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          this.ws.send(JSON.stringify({ type: 'audio_pcm', pcmBase64: base64 }));
        }
      };

      // Set up periodic MediaRecorder chunk analysis
      this.setupMediaRecorder(stream);

      this.isListening = true;
      this.notifyState('listening', 'Active: Ambient audio streaming');
      this.startVisualizerLoop();
      return true;
    } catch (err: any) {
      console.error('Failed to start audio listening:', err);
      this.notifyState('error', err?.message || 'Microphone access denied');
      return false;
    }
  }

  private setupMediaRecorder(stream: MediaStream) {
    try {
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const supportedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      this.mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
          // Keep a rolling buffer of latest chunks
          if (this.recordedChunks.length > 3) {
            this.recordedChunks.shift();
          }
        }
      };

      // Emit chunk every 1000ms
      this.mediaRecorder.start(1000);
    } catch (e) {
      console.warn('MediaRecorder init error:', e);
    }
  }

  private startVisualizerLoop = () => {
    const loop = () => {
      if (!this.isListening || !this.analyser) return;

      const freqData = new Uint8Array(this.analyser.frequencyBinCount);
      const timeData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freqData);
      this.analyser.getByteTimeDomainData(timeData);

      // Calculate approximate RMS and dB
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / timeData.length);
      const db = Math.max(20, Math.min(110, Math.round(20 * Math.log10(Math.max(rms, 0.001)) + 94)));

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

      this.onMetricsListeners.forEach((cb) =>
        cb({
          db,
          frequencyData: freqData,
          timeDomainData: timeData,
          estimatedDirection,
        })
      );

      // Trigger automatic chunk classification if sudden transient sound or high dB detected
      const now = Date.now();
      const isSoundEvent = db > this.baselineDb + 16 || db > 65;
      const timeSinceLast = now - this.lastAnalysisTime;

      if (isSoundEvent && timeSinceLast > 3200 && !this.isClassifying && this.recordedChunks.length > 0) {
        this.analyzeCurrentChunk(estimatedDirection, db);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  };

  public async analyzeCurrentChunk(estimatedDirection: DirectionCue = 'center', currentDb: number = 60) {
    if (this.isClassifying || this.recordedChunks.length === 0) return;
    this.isClassifying = true;
    this.lastAnalysisTime = Date.now();

    try {
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(this.recordedChunks, { type: mimeType });

      // Convert Blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
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
          mimeType: mimeType.split(';')[0] || 'audio/webm',
          metadata: {
            estimatedDirection,
            decibels: currentDb,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.alert) {
          // If it's pure silence or low ambient, don't spam urgent alert
          if (json.alert.urgency !== 'subtle' || json.alert.sound_name !== 'Ambient Background') {
            this.notifyAlert(json.alert);
          }
        }
      }
    } catch (e) {
      console.warn('Chunk classification request error:', e);
    } finally {
      this.isClassifying = false;
    }
  }

  // Simulates an alert directly (used by soundboard or direct simulation)
  public emitSimulatedAlert(alert: SoundAlert) {
    this.notifyAlert(alert);
  }

  public stopListening() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
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

    this.notifyState('idle', 'Standby - Tap to listen');
  }
}

export const audioClassifier = new AudioClassifierService();
