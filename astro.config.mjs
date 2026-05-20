import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321 },
  vite: {
    ssr: { noExternal: ['@libsql/client'] }
  }
});
