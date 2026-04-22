/// <reference types="vitest/config" />
import {defineConfig} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // Aide IA
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['test/**/*.{test,spec}.{js,jsx}'],
    },
})
