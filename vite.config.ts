import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The app now calls your local `hermes serve --provider xai` directly
    // (OpenAI-compatible). See .env.example and chatbot code.
  },
})
