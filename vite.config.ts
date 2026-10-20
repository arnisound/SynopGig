import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build also works under a sub-path
  // such as https://<user>.github.io/SynopGig/.
  base: './',
  plugins: [react()],
})
