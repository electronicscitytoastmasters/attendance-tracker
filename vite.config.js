import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'attendance' with your actual GitHub repository name
// e.g. if your repo URL is github.com/yourname/attendance → base: '/attendance/'
export default defineConfig({
  plugins: [react()],
  base: '/attendance/',
})
