/**
 * Higher-order audio feature extraction engine:
 * Computes Spectral Centroid, Spectral Flux, Spectral Rolloff,
 * Mel-Frequency Filterbank & MFCCs (Mel-Frequency Cepstral Coefficients),
 * and harmonic/percussive profile.
 */

export interface HigherOrderAudioFeatures {
  spectralCentroid: number; // in Hz
  spectralRolloff: number;  // in Hz (85% energy point)
  spectralFlux: number;     // spectral change rate
  spectralFlatness: number; // 0 (pure tone) to 1 (white noise)
  mfcc: number[];           // 12 Mel-Frequency Cepstral Coefficients
  percussiveScore: number;  // Peak-to-RMS transient sharpness (for knocks)
  harmonicEnergyRatio: number; // Ratio of harmonic to noisy energy (for sirens/crying)
  pitchEstimate: number;    // Estimated fundamental pitch F0 in Hz (0 if non-tonal)
  estimatedCategoryHint?: string;
}

export class AudioFeatureExtractor {
  private sampleRate: number;
  private fftSize: number;
  private numMelFilters: number;
  private numMfcc: number;
  private melFilterbank: Float32Array[] = [];
  private prevSpectrum: Float32Array | null = null;

  constructor(sampleRate: number = 16000, fftSize: number = 512, numMelFilters: number = 20, numMfcc: number = 12) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.numMelFilters = numMelFilters;
    this.numMfcc = numMfcc;
    this.initMelFilterbank();
  }

  // Convert Hz to Mel scale
  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  // Convert Mel to Hz
  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  // Pre-calculate triangular Mel-scale filterbanks
  private initMelFilterbank() {
    const numBins = this.fftSize / 2;
    const minMel = this.hzToMel(80);
    const maxMel = this.hzToMel(this.sampleRate / 2);

    const melPoints: number[] = [];
    for (let i = 0; i < this.numMelFilters + 2; i++) {
      melPoints.push(minMel + (i * (maxMel - minMel)) / (this.numMelFilters + 1));
    }

    const binPoints = melPoints.map((mel) => {
      const hz = this.melToHz(mel);
      return Math.floor(((this.fftSize + 1) * hz) / this.sampleRate);
    });

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

  // Compute Discrete Cosine Transform (DCT-II)
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
   * Extracts spectral centroid, rolloff, flux, MFCCs, and acoustic traits
   */
  public extractFeatures(
    frequencyData: Uint8Array,
    timeDomainData: Uint8Array,
    rawSamples?: Float32Array
  ): HigherOrderAudioFeatures {
    const numBins = frequencyData.length;
    const binWidth = (this.sampleRate / 2) / numBins;

    // 1. Magnitude Spectrum
    const magnitude = new Float32Array(numBins);
    let totalMagnitude = 0;
    let weightedSum = 0;

    for (let i = 0; i < numBins; i++) {
      const mag = frequencyData[i] / 255;
      magnitude[i] = mag;
      totalMagnitude += mag;
      weightedSum += mag * (i * binWidth);
    }

    // 2. Spectral Centroid (Center of Spectral Mass)
    const spectralCentroid = totalMagnitude > 0 ? Math.round(weightedSum / totalMagnitude) : 0;

    // 3. Spectral Rolloff (85% energy frequency)
    let rolloffSum = 0;
    const rolloffThreshold = totalMagnitude * 0.85;
    let spectralRolloff = 0;
    for (let i = 0; i < numBins; i++) {
      rolloffSum += magnitude[i];
      if (rolloffSum >= rolloffThreshold) {
        spectralRolloff = Math.round(i * binWidth);
        break;
      }
    }

    // 4. Spectral Flux (Frame-to-Frame Transition Rate)
    let spectralFlux = 0;
    if (this.prevSpectrum) {
      for (let i = 0; i < numBins; i++) {
        const diff = magnitude[i] - this.prevSpectrum[i];
        if (diff > 0) spectralFlux += diff * diff;
      }
      spectralFlux = Math.round(Math.sqrt(spectralFlux) * 100) / 100;
    }
    this.prevSpectrum = new Float32Array(magnitude);

    // 5. Spectral Flatness (Wiener entropy: Geometric Mean / Arithmetic Mean)
    let logSum = 0;
    let eps = 1e-6;
    for (let i = 0; i < numBins; i++) {
      logSum += Math.log(magnitude[i] * magnitude[i] + eps);
    }
    const geomMean = Math.exp(logSum / numBins);
    const arithMean = (totalMagnitude / numBins) || eps;
    const spectralFlatness = Math.min(1, Math.round((geomMean / (arithMean * arithMean + eps)) * 100) / 100);

    // 6. Mel-Frequency Filterbank Energy & MFCCs
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

    // 7. Percussive Score (Peak-to-RMS transient sharpness for door knocks)
    let maxPeak = 0;
    let sumSq = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const dev = Math.abs(timeDomainData[i] - 128);
      if (dev > maxPeak) maxPeak = dev;
      sumSq += dev * dev;
    }
    const rms = Math.sqrt(sumSq / timeDomainData.length) || 1;
    const percussiveScore = Math.round((maxPeak / rms) * 10) / 10;

    // 8. Harmonic-to-Noise Ratio & Pitch Detection (Autocorrelation)
    let pitchEstimate = 0;
    let harmonicEnergyRatio = 0;
    if (rawSamples && rawSamples.length > 512) {
      const corrLength = 512;
      let maxCorr = 0;
      let bestLag = 0;

      // Search fundamental frequency between 100Hz (lag 160) and 1200Hz (lag 13) at 16kHz
      const minLag = Math.floor(this.sampleRate / 1200);
      const maxLag = Math.floor(this.sampleRate / 100);

      let norm0 = 0;
      for (let i = 0; i < corrLength; i++) {
        norm0 += rawSamples[i] * rawSamples[i];
      }

      if (norm0 > 0.001) {
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
        if (rNorm > 0.4 && bestLag > 0) {
          pitchEstimate = Math.round(this.sampleRate / bestLag);
        }
      }
    }

    // 9. Classify Acoustic Signature Hint
    let estimatedCategoryHint = 'ambient';
    if (percussiveScore > 3.5 && spectralFlux > 0.15) {
      estimatedCategoryHint = 'percussive_knock';
    } else if (spectralCentroid > 2500 && harmonicEnergyRatio > 0.5) {
      estimatedCategoryHint = 'high_pitch_bell_or_alarm';
    } else if (pitchEstimate >= 400 && pitchEstimate <= 1400 && harmonicEnergyRatio > 0.35) {
      estimatedCategoryHint = 'tonal_siren_or_cry';
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
