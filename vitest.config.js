import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        // Logs de pino fuera del camino del reporte de tests.
        silent: true
    }
});
