// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://app-pro.vercel.app',
  integrations: [mdx(), sitemap(), tailwind()],
  vite: {
    server: {
      fs: {
        // Asegurarse de que la codificación es UTF-8
        strict: false
      }
    },
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        format: {
          // Forzar la codificación a UTF-8
          ascii_only: false,
          comments: false
        }
      }
    },
    // Asegurar la codificación correcta para todos los archivos
    esbuild: {
      charset: 'utf8'
    }
  }
});