import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the local Express server (npm run server) so the
    // OpenAI key never has to be exposed to the browser.
    proxy: {
      '/api': `http://localhost:${process.env.PORT || 3001}`,
    },
  },
})
