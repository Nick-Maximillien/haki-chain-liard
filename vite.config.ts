import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ------------------------------------------------------------------
  // FIX: This substitutes the Node.js 'global' object with the browser's 'window'
  define: {
    global: 'window', 
  },
  // ------------------------------------------------------------------

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});