const config = require('../config/env');
const logger = require('../config/logger');
const defaultStore = require('../store/conversation.store');
const messageService = require('./message.service');
const formatter = require('../utils/response.formatter');

// Barredor ÚNICO de conversaciones vencidas por inactividad.
//
// Un solo setInterval recorre las conversaciones activas y cierra las vencidas.
// NADA de setTimeout por conversación. El handle del interval queda registrado
// para poder frenarlo (clearInterval) en el shutdown del proceso y en los tests.

/**
 * @param {object} opts
 * @param {object} [opts.store]        Implementación de ConversationStore.
 * @param {object} [opts.sender]       Capa de envío (messageService).
 * @param {number} [opts.inactivityMs] Inactividad máxima antes de cerrar.
 * @param {number} [opts.intervalMs]   Período del barrido.
 * @param {function} [opts.clock]      Reloj inyectable (() => epoch ms) para tests.
 */
function createSweeper({
    store = defaultStore,
    sender = messageService,
    inactivityMs = config.conversation.inactivityMs,
    intervalMs = config.conversation.sweepIntervalMs,
    clock = Date.now
} = {}) {
    let handle = null;

    // Cierra una conversación vencida: borra del Map SIEMPRE y, aparte, intenta
    // avisar por Meta. Si el aviso falla (usuario bloqueó, red caída), igual
    // limpiamos y seguimos: un fallo puntual no frena el barrido.
    async function cerrarVencida(convo) {
        store.delete(convo.phone);
        await sender.enviarMensajeWhatsApp(convo.phone, formatter.templateCierrePorInactividad());
    }

    async function tick() {
        const ahora = clock();
        const activas = store.listActive();

        for (const convo of activas) {
            if (ahora - convo.lastMessageAt <= inactivityMs) continue;

            try {
                await cerrarVencida(convo);
                logger.info(`Conversación de ${convo.phone} cerrada por inactividad`);
            } catch (err) {
                // El borrado ya ocurrió dentro de cerrarVencida; solo falló el aviso.
                logger.warn({ err }, `No se pudo avisar el cierre por inactividad a ${convo.phone} (estado igual limpiado)`);
            }
        }
    }

    return {
        start() {
            if (handle) return handle; // idempotente: un solo interval.
            handle = setInterval(() => {
                tick().catch((err) => logger.error({ err }, 'Fallo inesperado en el barrido de conversaciones'));
            }, intervalMs);
            // No mantenemos vivo el proceso solo por el barredor.
            if (typeof handle.unref === 'function') handle.unref();
            logger.info(`Barredor de conversaciones iniciado (cada ${intervalMs}ms, inactividad ${inactivityMs}ms)`);
            return handle;
        },
        stop() {
            if (handle) {
                clearInterval(handle);
                handle = null;
                logger.info('Barredor de conversaciones detenido');
            }
        },
        // Expuesto para tests: dispara un barrido manual sin esperar el interval.
        tick
    };
}

module.exports = { createSweeper };
