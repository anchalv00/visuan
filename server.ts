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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

    const prompt = `You are a high-speed Environmental Audio Classifier specialized for Deaf and Hard of Hearing individuals.
Analyze the provided ambient audio clip. Identify non-speech and ambient acoustic events that Deaf/HOH people must know about for safety, home awareness, and social presence.
Key target categories:
- Safety/Urgent: Smoke/CO detector alarms, siren, car horn, screeching tires, glass shattering, baby crying distress wail, dog aggressive growl/bark.
- Attention/Warning: Door knocking, doorbell, microwave/oven timer, boiling kettle whistle, footsteps approaching, heavy object dropping, phone ringing.
- Emotional/Social: Sudden crowd applause, laughter burst, cheering, door opening/closing, dog gentle whine.
- Ambient/Context: Water running/dripping, thunder, appliance humming.

If speech is present, focus on tone/volume (e.g., shouting/screaming vs normal background chatter).
If only silence, subtle room fan, or ambient white noise is present, set sound_type: "ambient", urgency: "subtle", sound_name: "Ambient Background", description: "Normal room background with no critical alerts".

Directional hint from acoustic stereo analysis: ${metadata.estimatedDirection || 'unknown'}.
Decibel level: ${metadata.decibels ? `${metadata.decibels} dB` : 'unknown'}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const text = response.text?.trim() || '{}';
    let result;
    try {
      result = JSON.parse(text);
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
            'You are Visual Soundboard, an ambient environmental sound classifier for Deaf and Hard of Hearing users. ' +
            'Listen continuously to the audio stream. Whenever you hear an ambient sound of interest (such as a smoke alarm, dog growling or barking, car horn, door knock, doorbell, glass breaking, baby crying, microwave/appliance beep, kettle whistle, or sudden applause/cheering), ' +
            'immediately call the function `emit_audio_alert` with the exact sound details, urgency level, direction, and haptic rhythm. Do not wait for conversation. Prioritize safety alarms and high-urgency threats immediately.',
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
