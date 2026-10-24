import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/api/live' });

app.use(express.json({ limit: '25mb' }));

// Port 3000 is required by the AI Studio environment so Nginx (listening on 8080) can proxy to it
const PORT = 3000;

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Tool declaration for structured environmental sound alerts
const emitAudioAlertDeclaration = {
  name: 'emit_audio_alert',
  description: 'Trigger a visual and haptic alert when an environmental, safety, appliance, biological, animal, or emotional/social sound is detected in ambient audio.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sound_type: {
        type: Type.STRING,
        description: 'Category: safety, hazard, appliance, biological, animal, social, ambient, warning',
      },
      urgency: {
        type: Type.STRING,
        description: 'Urgency tier: urgent (life/safety immediate), warning (attention required), info (helpful ambient context), subtle (low priority)',
      },
      sound_name: {
        type: Type.STRING,
        description: 'Clear name of the sound (e.g., Smoke Alarm, Door Knocking, Dog Growling, Car Horn, Baby Crying, Glass Breaking, Water Boiling, Sudden Applause)',
      },
      description: {
        type: Type.STRING,
        description: 'Concise description of the acoustic pattern (e.g., Rhythmic high-frequency T3 temporal smoke alarm beeps, Heavy wooden door knock)',
      },
      direction_cue: {
        type: Type.STRING,
        description: 'Estimated direction or source orientation: left, center, right, behind, omni, approaching',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'Confidence value between 0.0 and 1.0',
      },
      haptic_pattern: {
        type: Type.STRING,
        description: 'Haptic pulse style: staccato_emergency, double_pulse, gentle_thrum, rapid_tap, heartbeat',
      },
    },
    required: ['sound_type', 'urgency', 'sound_name', 'description'],
  },
};

// Status API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// REST Endpoint: Fast Audio Chunk Classification with gemini-3.8-flash
app.post('/api/classify-audio', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm', metadata = {} } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const ai = getGeminiClient();

    const features = metadata.features || {};
    const featuresSummary = features.spectralCentroid
      ? `\nHigher-Order Digital Acoustic Feature Measurements:
- Spectral Centroid: ${features.spectralCentroid} Hz (High > 2400Hz: bike bells, smoke alarms; Mid 500-2200Hz: sirens, baby cries; Low < 400Hz: ambient hum)
- Fundamental Pitch F0: ${features.pitchEstimate ? `${features.pitchEstimate} Hz` : 'Non-tonal/transient'}
- Harmonic Energy Ratio: ${features.harmonicEnergyRatio ?? 'N/A'} (High indicates tonal siren, infant wail, alarm tone)
- Percussive Transient Score: ${features.percussiveScore ?? 'N/A'} (High > 3.0 indicates door knock, strike, or percussive tap)
- Spectral Flux: ${features.spectralFlux ?? 'N/A'} (High indicates fast onset or sudden transient change)
- Spectral Rolloff: ${features.spectralRolloff ? `${features.spectralRolloff} Hz` : 'N/A'}
- Spectral Flatness: ${features.spectralFlatness ?? 'N/A'} (Low < 0.2 indicates pure tone/harmonics like sirens or bells; High > 0.6 indicates noisy airflow)
- MFCC Timbre Vector (12 bands): [${features.mfcc ? features.mfcc.join(', ') : 'N/A'}]
- Acoustic Category Pre-Classification: ${features.estimatedCategoryHint || 'none'}`
      : '';

    const prompt = `You are a precision Environmental Audio Classifier specialized for Deaf and Hard of Hearing individuals.
Analyze the provided ambient audio clip along with the extracted higher-order acoustic features. Identify non-speech and environmental acoustic events that Deaf and Hard of Hearing people must be aware of for safety, home awareness, and daily life.
${featuresSummary}

Comprehensive Target Sound Catalog:
1. SIRENS & EMERGENCY (Urgency: urgent, Type: safety):
   - "Emergency Siren (Wail)": Classic rising and falling sinusoidal pitch sweep (police, fire truck, ambulance).
   - "Emergency Siren (Yelp)": Rapid, fast alternating high-pitch chirp siren.
   - "Emergency Siren (Two-Tone / Hi-Lo)": European emergency vehicle alternating hi-lo two-pitch siren.
   - "Civil Defense / Air Raid Siren": Continuous deep mechanical rising/falling warning siren.
   - "Building Evacuation Siren": Loud, continuous high-decibel pulsing alarm siren.
2. BIKE BELLS & MOBILITY (Urgency: warning, Type: warning):
   - "Bicycle Bell (Dual Ding-Dong)": Classic two-tone thumb-strike handlebar bell (bright resonant ping-pong).
   - "Bicycle Bell (Single Ping)": High-frequency brass/metallic ping (spur bell, road bike strike bell, > 2500Hz centroid).
   - "Rotary Bicycle Bell": Continuous mechanical whirring/rattling chime.
   - "E-Scooter / Pedestrian Horn": Electronic chirping chime or warning beeper from electric scooters and bikes.
3. BABY & INFANT SOUNDS (Urgency: urgent or warning, Type: biological):
   - "Baby Crying (Distress / Pain)": High-pitched piercing wails, infant screaming, breath-holding cries (strong harmonic energy around 450Hz-1200Hz).
   - "Baby Crying (Fussy / Hunger)": Repetitive rhythmic infant wails with breathing pauses.
   - "Toddler Screaming / Tantrum": Loud high-frequency vocal shrieks.
4. ALARMS & APPLIANCE TIMERS (Urgency: urgent or warning):
   - "Smoke Alarm (T3 Temporal)": Standard NFPA 3-beep pattern (beep-beep-beep pause) at ~3kHz.
   - "Carbon Monoxide Alarm (T4)": Repeating 4-beep pattern.
   - "Security Alarm": Burglar alarm, window intrusion alarm, continuous alternating siren.
   - "Kitchen Timer (Microwave)": Repeating end-of-cycle chime (single, triple, or melodic beep).
   - "Kitchen Timer (Oven / Countdown)": Rapid continuous electronic beeping.
5. DOOR & HOME ENTRY (Urgency: warning, Type: warning):
   - "Door Knocking": Percussive rapping or knuckles on a wooden door, table, wall, or desk (2 to 5 brief, sharp acoustic transient knocks).
   - "Doorbell (Ding-Dong)": Two-tone harmonic chime.
   - "Doorbell (Electronic Melody / Intercom)": Multi-tone chime or buzzer.
6. VEHICLE & TRAFFIC (Urgency: urgent or warning, Type: safety):
   - "Car Honk (Urgent Blast)": Heavy vehicle horn blast, sudden automotive danger warning.
   - "Car Honk (Double Tap)": Brief double-tap car horn.
   - "Truck Backing-Up Beeper": Pulsed 1kHz industrial reverse beeper.
7. HAZARDS & IMPACTS:
   - "Glass Shattering / Breaking": High-frequency fracturing and falling shards.
   - "Dog Barking (Aggressive / Warning)": Staccato canine barks or warning growls.
   - "Water Running / Overflowing": Steady running faucet, splashing or boiling water.

CRITICAL CLASSIFICATION & SENSITIVITY RULES:
1. HIGH SENSITIVITY FOR VIDEO PLAYBACK & DISTANT SOUNDS: Audio is frequently played through video clips, phone speakers, TV, or recorded across a room. If characteristic acoustic patterns of an emergency siren (wail/yelp/hi-lo sweep), baby crying (infant distress/wail), bicycle bell (metallic ping), smoke alarm (beeps), or door knock are present in the audio—even if quiet, played through computer/laptop speakers, or slightly distant—you MUST classify it with high confidence (> 0.85) and appropriate urgency.
2. STRICT SILENCE & AMBIENT NOISE FILTER: Only when there is truly NO identifiable sound event, and the audio is pure quiet room tone, gentle fan hum, microphone static, or silence, output:
   {
     "sound_name": "Ambient Background",
     "sound_type": "ambient",
     "urgency": "subtle",
     "description": "Quiet ambient room tone or low noise floor",
     "confidence": 0.1,
     "direction_cue": "center",
     "haptic_pattern": "gentle_thrum"
   }
   CRITICAL: DO NOT guess "Bicycle Bell" on pure high-frequency microphone hiss or static. But DO detect sirens, baby cries, bike bells, alarms, and knocks whenever they are audibly playing.
3. SIREN VALIDATION: Detect rising/falling pitch sweeps, yelps, or alternating two-tones even if accompanied by video background noise.
4. BABY CRYING VALIDATION: Detect infant vocalizations, distress cries, and wails even through phone or laptop audio playback.
5. DOOR KNOCK VALIDATION: Detect rapid percussive knocks or raps.
6. When an authentic target sound is present, output the matching target name with high confidence (> 0.85) and appropriate urgency tier.

Directional hint: ${metadata.estimatedDirection || 'unknown'}.
Decibel level: ${metadata.decibels ? `${metadata.decibels} dB` : 'unknown'}.`;

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite-preview', 'gemini-3.8-flash'];
    let response: any = null;
    let usedModel = '';

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioData,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sound_name: { type: Type.STRING },
                sound_type: { type: Type.STRING },
                urgency: { type: Type.STRING },
                description: { type: Type.STRING },
                direction_cue: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                haptic_pattern: { type: Type.STRING },
                visual_color: { type: Type.STRING },
              },
              required: [
                'sound_name',
                'sound_type',
                'urgency',
                'description',
                'direction_cue',
                'confidence',
                'haptic_pattern',
              ],
            },
          },
        });
        usedModel = model;
        break;
      } catch (err: any) {
        console.warn(`[AudioClassifier] Model ${model} failed, trying next:`, err?.status || err?.message?.slice(0, 100));
      }
    }

    if (!response) {
      throw new Error('All candidate Gemini models were unavailable or quota exhausted.');
    }

    const text = response.text?.trim() || '{}';
    let result;
    try {
      result = JSON.parse(text);
      console.log(`[AudioClassifier] Analyzed (${mimeType}): ${result.sound_name} (${result.urgency})`);
    } catch {
      result = {
        sound_name: 'Sound Detected',
        sound_type: 'ambient',
        urgency: 'info',
        description: text.slice(0, 100),
        direction_cue: metadata.estimatedDirection || 'center',
        confidence: 0.8,
        haptic_pattern: 'double_pulse',
      };
    }

    res.json({
      success: true,
      alert: {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        decibels: metadata.decibels || 0,
        ...result,
      },
    });
  } catch (error: any) {
    console.error('Error classifying audio:', error);
    res.status(500).json({
      error: error?.message || 'Failed to classify audio',
    });
  }
});

// WebSocket Live Stream Handling
wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to /api/live WebSocket');

  let liveSession: any = null;
  const ai = getGeminiClient();

  const initLiveSession = async () => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        clientWs.send(
          JSON.stringify({
            type: 'status',
            message: 'API key not configured for Gemini Live',
            ready: false,
          })
        );
        return;
      }

      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [emitAudioAlertDeclaration] }],
          systemInstruction:
            'You are visuan, an environmental acoustic classifier for Deaf and Hard of Hearing awareness. ' +
            'Listen to the ambient audio stream. When a distinct target environmental sound event occurs, immediately call `emit_audio_alert`. ' +
            'Target sounds: ' +
            '1. "Emergency Siren": police, ambulance, fire engine wailing or hi-lo sirens. ' +
            '2. "Baby Crying": infant distress wails, high-pitched sobbing or screams. ' +
            '3. "Door Knocking": rhythmic rapping, knuckles on wood/door/table surface. ' +
            '4. "Smoke Alarm": 3kHz piercing T3 beep pattern or detector alarm. ' +
            '5. "Security Alarm": burglar alarm, alternating siren horn. ' +
            '6. "Timers" / "Timer Beeping": microwave finish beeps, oven countdown chirps. ' +
            '7. "Car Honk": vehicle horn blast, sudden automotive warning. ' +
            '8. "Bicycle Bell": clear metallic ringing ping or handlebar ding-dong chime. ' +
            'CRITICAL: If the room is quiet or there is only fan hum, typing, or microphone static, DO NOT trigger emit_audio_alert. Only trigger when a real, audible sound event is detected. Do not produce conversational speech.',
        },
        callbacks: {
          onmessage: async (msg: any) => {
            // Check for tool calls
            const toolCall = msg.toolCall;
            if (toolCall) {
              const calls = toolCall.functionCalls;
              if (calls && Array.isArray(calls)) {
                for (const call of calls) {
                  if (call.name === 'emit_audio_alert') {
                    const alertData = {
                      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      timestamp: Date.now(),
                      ...call.args,
                    };

                    clientWs.send(
                      JSON.stringify({
                        type: 'alert',
                        alert: alertData,
                      })
                    );

                    // Acknowledge function call to live session
                    if (liveSession?.sendToolResponse) {
                      await liveSession.sendToolResponse({
                        functionResponses: [
                          {
                            response: { output: { status: 'alert_emitted_to_hud' } },
                            id: call.id,
                          },
                        ],
                      });
                    }
                  }
                }
              }
            }

            // Also check if text / transcription was generated
            const textPart = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text);
            if (textPart?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'transcript',
                  text: textPart.text,
                })
              );
            }
          },
        },
      });

      clientWs.send(
        JSON.stringify({
          type: 'status',
          message: 'Connected to Gemini Live audio session',
          ready: true,
        })
      );
    } catch (err: any) {
      console.warn('Gemini Live session connection notice:', err?.message || err);
      clientWs.send(
        JSON.stringify({
          type: 'status',
          message: 'Live session fallback ready: continuous chunk classifier active',
          ready: true,
          mode: 'hybrid_fallback',
        })
      );
    }
  };

  await initLiveSession();

  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === 'audio_pcm' && parsed.pcmBase64) {
        if (liveSession && typeof liveSession.sendRealtimeInput === 'function') {
          liveSession.sendRealtimeInput({
            audio: {
              data: parsed.pcmBase64,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      } else if (parsed.type === 'ping') {
        clientWs.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      // Ignore parse errors on ping
    }
  });

  clientWs.on('close', () => {
    if (liveSession && typeof liveSession.close === 'function') {
      try {
        liveSession.close();
      } catch (e) {
        // cleanup ignore
      }
    }
  });
});

// Setup Vite or static serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Visual Soundboard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
