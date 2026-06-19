const config = require('../config/env');
const logger = require('../config/logger');
const messageService = require('../services/message.service');
const conversationService = require('../services/conversation.service');

// Tipos de multimedia que disparan el aviso de "formato no soportado" (Escenario F).
const TIPOS_MULTIMEDIA = ['audio', 'voice', 'image', 'video', 'document', 'sticker'];

const verificarWebhook = (req, res) => {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (token === config.meta.verifyToken) {
        logger.info('Webhook verificado exitosamente por Meta');
        return res.status(200).send(challenge);
    }
    logger.warn('Intento de verificación de webhook fallido (Token inválido)');
    res.sendStatus(403);
};

const recibirMensaje = (req, res) => {
    // Meta exige respuesta < 5s. Cualquier 4xx/5xx dispara reintentos -> duplicados.
    // Por eso siempre 200 inmediato y el procesamiento corre fuera del ciclo HTTP.
    res.sendStatus(200);

    try {
        const value = req.body.entry?.[0]?.changes?.[0]?.value;
        if (!value) return;

        // Eventos de estado (sent/delivered/read) y otros que no sean mensajes: descartar silenciosamente.
        if (!value.messages || value.messages.length === 0) {
            return;
        }

        const messageData = value.messages[0];

        // Respuesta de botonera (botones Sí/No de la capa de conversación).
        if (messageData.type === 'interactive' && messageData.interactive?.button_reply) {
            logger.info('Nueva respuesta de botonera recibida vía Webhook');
            conversationService
                .manejar({
                    from: messageData.from,
                    tipo: 'boton',
                    texto: messageData.interactive.button_reply.title,
                    botonId: messageData.interactive.button_reply.id
                })
                .catch((err) => logger.error({ err }, 'Fallo asíncrono procesando respuesta de botonera'));
            return;
        }

        // Solo procesamos mensajes de texto. El resto se evalúa abajo.
        if (messageData.type !== 'text' || !messageData.text?.body) {
            if (TIPOS_MULTIMEDIA.includes(messageData.type)) {
                // Escenario F: avisar que no se puede procesar ese formato (async, ya respondimos 200).
                messageService
                    .responderFormatoNoSoportado(messageData.from)
                    .catch((err) => logger.error({ err }, 'Fallo enviando aviso de formato no soportado'));
            } else {
                // Reacciones, eventos system y otros tipos: se siguen ignorando en silencio.
                logger.debug(`Mensaje ignorado por tipo no soportado: ${messageData.type}`);
            }
            return;
        }

        logger.info(`Nuevo mensaje entrante de tipo texto recibido vía Webhook`);
        conversationService
            .manejar({
                from: messageData.from,
                tipo: 'text',
                texto: messageData.text.body
            })
            .catch((err) => {
                logger.error({ err }, 'Fallo asíncrono procesando mensaje entrante');
            });
    } catch (error) {
        // Nunca devolvemos 500: ya respondimos 200. Solo logueamos.
        logger.error({ err: error }, 'Fallo en la capa de controladores del Webhook');
    }
};

module.exports = { verificarWebhook, recibirMensaje };
