import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno desde el archivo .env
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Pasa la API Key al código cliente de forma segura
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});