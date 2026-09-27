/// <reference types="vitest/config" />
import {defineConfig} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

// https://vite.dev/config/
export default defineConfig({
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
})
