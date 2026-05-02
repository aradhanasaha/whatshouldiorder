import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { openaiApiPlugin } from './server/openaiApiPlugin.js';

export default defineConfig({
  plugins: [react(), openaiApiPlugin()],
  resolve: {
    alias: {
      'food-db': path.resolve(__dirname, 'food-db.js'),
    },
  },
});
