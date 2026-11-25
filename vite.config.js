import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // মোবাইল (PWA) বিল্ড যেকোনো ফোল্ডারে/GitHub Pages-এ চলার জন্য relative path
  base: mode === 'mobile' ? './' : '/',
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  }
}));
