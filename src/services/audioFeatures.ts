/**
 * @file audioFeatures.ts
 * @description Higher-Order Digital Signal Processing (DSP) Feature Extraction Engine.
 *
 * How this file relates to the app's design & functionality:
 * - Raw microphone audio alone can be noisy or ambiguous, especially when sounds are played
 *   from across a room or through laptop/phone speakers.
 * - Before sending audio to the backend AI classifier, `visuan` runs this real-time DSP pipeline
 *   in the browser to extract mathematically objective acoustic measurements (Spectral Centroid,
 *   MFCCs, Fundamental Pitch F0, Harmonicity, and Percussive Sharpness).
 * - These features serve three vital roles:
 *   1. **Smart Noise Gating**: Prevents false positives (like mistaking quiet microphone hiss
 *      for a bicycle bell) while staying sensitive to real knocks, cries, and sirens.
 *   2. **AI Context Enrichment**: Attached to `/api/classify-audio` requests so Gemini can see
 *      exact frequency and harmonic data alongside the raw WAV audio.
 *   3. **Rate-Limit Resilience**: Powers the server's deterministic fallback classifier if
 *      cloud API rate limits (HTTP 429) are ever reached during live demos.
 */

export interface HigherOrderAudioFeatures {
  /** Center of mass of the frequency spectrum in Hz (measures "brightness" of a sound) */
  spectralCentroid: number;
  /** Frequency in Hz below which 85% of the total spectral energy is concentrated */
  spectralRolloff: number;
  /** Frame-to-frame rate of change in the frequency spectrum (detects sudden sound onsets) */
  spectralFlux: number;
  /** Wiener entropy from 0 (pure musical/siren tone) to 1 (flat white noise/static) */
  spectralFlatness: number;
  /** 12 Mel-Frequency Cepstral Coefficients capturing the "timbre" or vocal/instrument texture */
  mfcc: number[];
  /** Peak-to-RMS amplitude ratio measuring sharp physical impacts (e.g., knuckles knocking on wood) */
  percussiveScore: number;
  /** Ratio of periodic/harmonic energy to noisy energy (0 to 1), high for sirens & infant cries */
  harmonicEnergyRatio: number;
  /** Estimated fundamental frequency (F0) in Hz via time-domain autocorrelation (0 if non-tonal) */
  pitchEstimate: number;
  /** Preliminary rule-based acoustic signature hint ('ambient' | 'percussive_knock' | 'high_pitch_bell_or_alarm' | 'tonal_siren_or_cry') */
  estimatedCategoryHint?: string;
}

export class AudioFeatureExtractor {
  private sampleRate: number;
  private fftSize: number;
  private numMelFilters: number;
  private numMfcc: number;
  /** Pre-computed triangular filter weights mapped onto the human perceptual Mel frequency scale */
  private melFilterbank: Float32Array[] = [];
  /** Stores the previous frame's magnitude spectrum so we can calculate frame-to-frame Spectral Flux */
  private prevSpectrum: Float32Array | null = null;

  /**
   * @param sampleRate Audio sampling rate in Hz (default 16,000 Hz, ideal for speech & environmental sounds)
   * @param fftSize Fast Fourier Transform window size (512 samples -> 256 frequency bins)
   * @param numMelFilters Number of triangular Mel filterbanks (default 20)
   * @param numMfcc Number of cepstral coefficients to retain after Discrete Cosine Transform (default 12)
   */
  constructor(sampleRate: number = 16000, fftSize: number = 512, numMelFilters: number = 20, numMfcc: number = 12) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.numMelFilters = numMelFilters;
    this.numMfcc = numMfcc;
    this.initMelFilterbank();
  }

  /**
   * Converts a linear frequency in Hertz (Hz) to the human perceptual Mel scale.
   * Human hearing perceives pitch logarithmically (we tell apart 100Hz vs 200Hz much more
   * easily than 5100Hz vs 5200Hz). The Mel scale spaces frequencies the way the human cochlea does.
   */
  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  /**
   * Inverse transformation from the perceptual Mel scale back to linear Hertz (Hz).
   */
  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  /**
   * Pre-calculates a bank of overlapping triangular filters spaced evenly on the Mel scale
   * between 80 Hz and the Nyquist frequency (`sampleRate / 2`, i.e., 8,000 Hz).
   * Pre-computing these weights once in the constructor keeps the 60fps audio loop fast.
   */
  private initMelFilterbank() {
    const numBins = this.fftSize / 2;
    const minMel = this.hzToMel(80);
    const maxMel = this.hzToMel(this.sampleRate / 2);

    // Generate evenly spaced points in Mel space
    const melPoints: number[] = [];
    for (let i = 0; i < this.numMelFilters + 2; i++) {
      melPoints.push(minMel + (i * (maxMel - minMel)) / (this.numMelFilters + 1));
    }

    // Convert those Mel points back to FFT bin indices
    const binPoints = melPoints.map((mel) => {
      const hz = this.melToHz(mel);
      return Math.floor(((this.fftSize + 1) * hz) / this.sampleRate);
    });

    // Construct each triangular filter (rising slope from left->center, falling slope from center->right)
    this.melFilterbank = [];
    for (let m = 1; m <= this.numMelFilters; m++) {
      const filter = new Float32Array(numBins);
      const left = binPoints[m - 1];
      const center = binPoints[m];
      const right = binPoints[m + 1];

      for (let k = 0; k < numBins; k++) {
        if (k >= left && k <= center && center > left) {
          filter[k] = (k - left) / (center - left);
        } else if (k >= center && k <= right && right > center) {
          filter[k] = (right - k) / (right - center);
        } else {
          filter[k] = 0;
        }
      }
      this.melFilterbank.push(filter);
    }
  }

  /**
   * Computes the Type-II Discrete Cosine Transform (DCT-II) on the log-Mel filter energies.
   * Why DCT? Adjacent Mel filterbanks overlap and are highly correlated. The DCT decorrelates
   * them into compact Mel-Frequency Cepstral Coefficients (MFCCs) that describe the overall
   * spectral envelope (timbre)—crucial for distinguishing a baby's vocal tract from a siren horn.
   */
  private computeDCT(input: Float32Array): number[] {
    const N = input.length;
    const output: number[] = new Array(this.numMfcc).fill(0);

    for (let k = 0; k < this.numMfcc; k++) {
      let sum = 0;
      for (let n = 0; n < N; n++) {
        sum += input[n] * Math.cos((Math.PI * k * (n + 0.5)) / N);
      }
      output[k] = Math.round(sum * 100) / 100;
    }

    return output;
  }

  /**
   * Main DSP pipeline called on every animation frame and prior to audio chunk classification.
   *
   * @param frequencyData Byte frequency spectrum (0..255 per bin) from Web Audio `AnalyserNode.getByteFrequencyData`
   * @param timeDomainData Byte waveform samples (centered at 128) from `AnalyserNode.getByteTimeDomainData`
   * @param rawSamples Optional high-precision Float32 PCM waveform (-1.0..+1.0) for autocorrelation pitch detection
   */
  public extractFeatures(
    frequencyData: Uint8Array,
    timeDomainData: Uint8Array,
    rawSamples?: Float32Array
  ): HigherOrderAudioFeatures {
    const numBins = frequencyData.length;
    // Width in Hz of each FFT bin: (16000 / 2) / 256 = 31.25 Hz per bin
    const binWidth = (this.sampleRate / 2) / numBins;

    // -------------------------------------------------------------------------
    // 1. Normalized Magnitude Spectrum
    // Convert 0..255 byte values into normalized 0.0..1.0 magnitudes and compute
    // the frequency-weighted sum needed for the Spectral Centroid.
    // -------------------------------------------------------------------------
    const magnitude = new Float32Array(numBins);
    let totalMagnitude = 0;
    let weightedSum = 0;

    for (let i = 0; i < numBins; i++) {
      const mag = frequencyData[i] / 255;
      magnitude[i] = mag;
      totalMagnitude += mag;
      weightedSum += mag * (i * binWidth);
    }

    // -------------------------------------------------------------------------
    // 2. Spectral Centroid (Center of Spectral Mass)
    // Formula: Sum(f_i * mag_i) / Sum(mag_i)
    // Tells us where the "average" frequency is located:
    // - > 2,400 Hz: Bright metallic sounds (bicycle bells, 3kHz smoke alarms)
    // - 500–2,200 Hz: Mid-range harmonic sounds (sirens, baby crying)
    // - < 400 Hz: Low room rumble or HVAC hum
    // Note: We gate on `hasAudibleEnergy` so quiet microphone static doesn't
    // artificially produce a high-frequency centroid and false-trigger a bike bell.
    // -------------------------------------------------------------------------
    const hasAudibleEnergy = totalMagnitude > 2.5;
    const spectralCentroid = (hasAudibleEnergy && totalMagnitude > 0)
      ? Math.round(weightedSum / totalMagnitude)
      : 0;

    // -------------------------------------------------------------------------
    // 3. Spectral Rolloff (85% Cumulative Energy Point)
    // Finds the frequency bin where 85% of the frame's total spectral energy
    // has been accumulated. Helps separate broadband noise from focused tones.
    // -------------------------------------------------------------------------
    let rolloffSum = 0;
    const rolloffThreshold = totalMagnitude * 0.85;
    let spectralRolloff = 0;
    if (hasAudibleEnergy) {
      for (let i = 0; i < numBins; i++) {
        rolloffSum += magnitude[i];
        if (rolloffSum >= rolloffThreshold) {
          spectralRolloff = Math.round(i * binWidth);
          break;
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. Spectral Flux (Positive Frame-to-Frame Spectral Change)
    // Measures how rapidly the frequency spectrum is changing compared to the
    // previous frame. Sudden onsets (door knocks, glass breaking, alarm beeps)
    // create a spike in Spectral Flux.
    // -------------------------------------------------------------------------
    let spectralFlux = 0;
    if (this.prevSpectrum && hasAudibleEnergy) {
      for (let i = 0; i < numBins; i++) {
        const diff = magnitude[i] - this.prevSpectrum[i];
        if (diff > 0) spectralFlux += diff * diff;
      }
      spectralFlux = Math.round(Math.sqrt(spectralFlux) * 100) / 100;
    }
    this.prevSpectrum = new Float32Array(magnitude);

    // -------------------------------------------------------------------------
    // 5. Spectral Flatness (Wiener Entropy: Geometric Mean / Arithmetic Mean)
    // Distinguishes pure tones (flatness near 0.0, e.g., siren wail, smoke alarm,
    // bike bell chime) from flat broadband hiss or air conditioner noise (near 1.0).
    // -------------------------------------------------------------------------
    let logSum = 0;
    const eps = 1e-6;
    for (let i = 0; i < numBins; i++) {
      logSum += Math.log(magnitude[i] * magnitude[i] + eps);
    }
    const geomMean = Math.exp(logSum / numBins);
    const arithMean = (totalMagnitude / numBins) || eps;
    const spectralFlatness = Math.min(1, Math.round((geomMean / (arithMean * arithMean + eps)) * 100) / 100);

    // -------------------------------------------------------------------------
    // 6. Mel-Frequency Filterbank Energy & MFCCs
    // Multiply the power spectrum (`magnitude^2`) by each triangular Mel filter,
    // take the logarithm (simulating human loudness perception), and apply DCT-II.
    // -------------------------------------------------------------------------
    const melEnergies = new Float32Array(this.numMelFilters);
    for (let m = 0; m < this.numMelFilters; m++) {
      let energy = 0;
      const filter = this.melFilterbank[m];
      for (let k = 0; k < numBins; k++) {
        energy += (magnitude[k] * magnitude[k]) * filter[k];
      }
      melEnergies[m] = Math.log(energy + 1e-5);
    }
    const mfcc = this.computeDCT(melEnergies);

    // -------------------------------------------------------------------------
    // 7. Percussive Score (Crest Factor: Peak-to-RMS Amplitude Ratio)
    // Time-domain waveform analysis: a sharp impact like knocking on a door has
    // a very high instantaneous peak relative to its average RMS energy.
    // -------------------------------------------------------------------------
    let maxPeak = 0;
    let sumSq = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const dev = Math.abs(timeDomainData[i] - 128);
      if (dev > maxPeak) maxPeak = dev;
      sumSq += dev * dev;
    }
    const rms = Math.sqrt(sumSq / timeDomainData.length) || 1;
    const percussiveScore = Math.round((maxPeak / rms) * 10) / 10;

    // -------------------------------------------------------------------------
    // 8. Harmonic-to-Noise Ratio & Fundamental Pitch (F0) via Autocorrelation
    // Compares the waveform with time-shifted copies of itself (`lag`).
    // If a repeating periodic wave exists (like a 700Hz siren or 500Hz baby cry),
    // the correlation peaks strongly at `lag = sampleRate / F0`.
    // -------------------------------------------------------------------------
    let pitchEstimate = 0;
    let harmonicEnergyRatio = 0;
    if (hasAudibleEnergy && rawSamples && rawSamples.length > 512) {
      const corrLength = 512;
      let maxCorr = 0;
      let bestLag = 0;

      // Search fundamental frequency between 100Hz (lag 160) and 1200Hz (lag 13) at 16kHz
      const minLag = Math.floor(this.sampleRate / 1200);
      const maxLag = Math.floor(this.sampleRate / 100);

      // Zero-lag energy (`norm0`) used to normalize correlation into [0.0, 1.0]
      let norm0 = 0;
      for (let i = 0; i < corrLength; i++) {
        norm0 += rawSamples[i] * rawSamples[i];
      }

      if (norm0 > 0.005) {
        for (let lag = minLag; lag < maxLag && lag + corrLength < rawSamples.length; lag++) {
          let sum = 0;
          for (let i = 0; i < corrLength; i++) {
            sum += rawSamples[i] * rawSamples[i + lag];
          }
          if (sum > maxCorr) {
            maxCorr = sum;
            bestLag = lag;
          }
        }
        const rNorm = maxCorr / norm0;
        harmonicEnergyRatio = Math.round(Math.max(0, Math.min(1, rNorm)) * 100) / 100;
        // Only lock onto a pitch estimate if the signal is genuinely periodic (rNorm > 0.45)
        if (rNorm > 0.45 && bestLag > 0) {
          pitchEstimate = Math.round(this.sampleRate / bestLag);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 9. Preliminary Acoustic Signature Hint
    // Combines the extracted features into a fast local hint so `audioClassifier.ts`
    // knows immediately when an important sound pattern has started.
    // -------------------------------------------------------------------------
    let estimatedCategoryHint = 'ambient';
    if (hasAudibleEnergy) {
      if (percussiveScore > 4.2 && spectralFlux > 0.2) {
        estimatedCategoryHint = 'percussive_knock';
      } else if (spectralCentroid > 2400 && harmonicEnergyRatio > 0.55 && spectralFlatness < 0.35) {
        estimatedCategoryHint = 'high_pitch_bell_or_alarm';
      } else if (pitchEstimate >= 400 && pitchEstimate <= 1400 && harmonicEnergyRatio > 0.4 && spectralFlatness < 0.4) {
        estimatedCategoryHint = 'tonal_siren_or_cry';
      }
    }

    return {
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      spectralFlatness,
      mfcc,
      percussiveScore,
      harmonicEnergyRatio,
      pitchEstimate,
      estimatedCategoryHint,
    };
  }
}

export const featureExtractor = new AudioFeatureExtractor();
