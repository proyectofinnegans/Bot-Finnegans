const express = require('express');
const config = require('./config/env');
const logger = require('./config/logger');
const webhookRoutes = require('./routes/webhook.routes');
const { createSweeper } = require('./services/conversation.sweeper');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
});

// Healthcheck para Railway / liveness probes.
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Rutas
app.use('/api', webhookRoutes);

// Barredor único de conversaciones en memoria (timeout por inactividad).
const sweeper = createSweeper();

const server = app.listen(config.port, () => {
    logger.info(`Servidor inicializado y escuchando en el puerto ${config.port}`);
    logger.info(`Entorno de Datos Configurado: ${config.useMockData ? `MOCK API (${config.finnegans.apiUrl})` : 'FINNEGANS API (Producción)'}`);
    sweeper.start();
});

// Shutdown ordenado: frenamos el interval para no dejarlo huérfano y cerramos el server.
function shutdown(signal) {
    logger.info(`Recibido ${signal}, cerrando ordenadamente...`);
    sweeper.stop();
    server.close(() => {
        logger.info('Servidor HTTP cerrado. Saliendo.');
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
