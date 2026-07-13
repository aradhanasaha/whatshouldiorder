import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { apiPlugin } from './server/apiPlugin.js';

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      'food-db': path.resolve(__dirname, 'food-db.js'),
    },
  },
});
