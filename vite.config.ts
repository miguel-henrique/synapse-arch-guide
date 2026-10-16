import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5900,
    host: true,
  },
  preview: {
    port: 5900,
    host: true,
  },
});
