/// <reference types="vitest/config" />
import {defineConfig, loadEnv} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

// https://vite.dev/config/
export default defineConfig(({mode}) => ({
    // the session is a cookie of the site (see src/features/auth/AuthContext.jsx): the page calls /api on
    // its own address, sent on to the server of API_TARGET, as Caddy does once deployed
    server: {
        proxy: {
            '/api': loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '').API_TARGET ?? 'http://localhost:3001',
        },
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    // Aide IA
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['tests/**/*.{test,spec}.{js,jsx}'],
        setupFiles: './vitest.setup.js',
    },
}))
