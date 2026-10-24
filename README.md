# Visual Soundboard

A minimalist ambient audio listener that captures environmental sounds through your microphone and uses Gemini Live audio classification to detect key acoustic events with real-time feedback and tactile haptics.

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: v18.0.0 or later (v20+ LTS recommended)
- **Package Manager**: `npm` (comes with Node.js), `yarn`, `pnpm`, or `bun`
- **Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **A browser with microphone support**: Chrome, Edge, Firefox, or Safari (must allow microphone permissions via `http://localhost:3000`)

---

## Quick Start (Local Setup)

### 1. Clone or Download the Project

If you haven't already cloned the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

Install all required frontend and backend packages:

```bash
npm install
```

*(Or using bun / pnpm / yarn)*:
```bash
bun install
# or
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` in your text editor and add your Google Gemini API key:

```env
# Required: Your Gemini API Key from Google AI Studio
GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Optional: Host URL (defaults to http://localhost:3000)
APP_URL="http://localhost:3000"

# Optional: Port (defaults to 3000)
PORT=3000
```

> **Note**: The application uses Gemini Live and audio analysis endpoints configured in `server.ts`. If no API key is provided, the local audio visualizer and microphone input will still run, but AI environmental classification calls will be disabled.

### 4. Start the Local Development Server

Run the development command:

```bash
npm run dev
```

This starts the unified Express + Vite development server on **`http://localhost:3000`** with WebSocket streaming enabled for real-time audio analysis.

### 5. Open in Your Browser

1. Navigate to: **`http://localhost:3000`**
2. Click the central **LISTEN** button.
3. When prompted by your browser, click **Allow** to grant microphone access.
4. The button will switch to active listening mode (`STOP`), showing an animated pulse ring and real-time audio detection feedback.

---

## Production Build

To build the client application for production:

```bash
npm run build
```

This compiles TypeScript and bundles assets into the `dist/` directory.

To run the production server:

```bash
npm start
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Express backend and Vite frontend with live server on port 3000 |
| `npm run build` | Compiles TypeScript and creates optimized production assets in `/dist` |
| `npm run start` | Runs the production Node server |
| `npm run preview` | Previews the production build locally using Vite |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans `dist` and compiled server artifacts |

---

## Project Structure

```text
├── .env.example                  # Template for required environment variables
├── index.html                    # HTML entry point with metadata
├── package.json                  # Dependencies and scripts
├── server.ts                     # Express + WebSocket backend proxying Gemini Live audio
├── src/
│   ├── App.tsx                   # Main light-mode application container
│   ├── main.tsx                  # React DOM root entry point
│   ├── index.css                 # Global Tailwind CSS styles
│   ├── components/
│   │   └── MicrophoneController.tsx  # Central Listen button, pulse rings & state
│   ├── services/
│   │   ├── audioClassifier.ts    # Web Audio API microphone stream & WebSocket handler
│   │   ├── haptics.ts            # Tactile vibration engine (Web Vibration API)
│   │   └── notifications.ts      # Browser background notifications service
│   ├── types/
│   │   └── sound.ts              # Sound alert, urgency & setting TypeScript types
│   └── utils/
│       └── theme.ts              # Theme utilities
├── tsconfig.json                 # TypeScript compiler configuration
└── vite.config.ts                # Vite build configuration & aliases
```

---

## Troubleshooting

- **Microphone Access Denied**:
  - In your browser address bar, click the camera/microphone icon next to `localhost:3000` and select **Always allow**. Refresh the page.
- **Port 3000 in use**:
  - You can change the port by setting `PORT=3001` in your `.env` file or running: `PORT=3001 npm run dev`.
- **Gemini Classification Not Responding**:
  - Verify that `GEMINI_API_KEY` in `.env` is valid and active at [Google AI Studio](https://aistudio.google.com/app/apikey).
