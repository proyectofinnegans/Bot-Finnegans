const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');
const parser = require('../utils/intent.parser');
const formatter = require('../utils/response.formatter');

class MessageService {
    async procesarMensajeEntrante(numeroUsuario, textoRecibido) {
        const ticketService = require('./ticket.service'); // Importación interna para evitar dependencias circulares
        
        logger.info(`Analizando intención del mensaje de ${numeroUsuario}`);
        const numeroTicketDetectado = parser.extraerNumeroCaso(textoRecibido);

        let respuestaCrm;

        if (numeroTicketDetectado) {
            logger.debug(`Intención detectada: Consulta de ticket #${numeroTicketDetectado}`);
            respuestaCrm = await ticketService.consultarEstado(numeroTicketDetectado);
        } else {
            logger.debug(`Intención no detectada. Solicitando formato correcto.`);
            respuestaCrm = formatter.templateErrorValidacion();
        }

        await this.enviarMensajeWhatsApp(numeroUsuario, respuestaCrm);
    }

    async responderFormatoNoSoportado(numeroUsuario) {
        logger.debug(`Respondiendo aviso de formato no soportado a ${numeroUsuario}`);
        await this.enviarMensajeWhatsApp(numeroUsuario, formatter.templateFormatoNoSoportado());
    }

    // Envía un mensaje interactivo con botones de respuesta (reply buttons).
    // botones: [{ id, title }] (máx 3 según WhatsApp).
    async enviarBotones(numeroDestino, cuerpo, botones) {
        const url = `https://graph.facebook.com/v18.0/${config.meta.phoneNumberId}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            to: numeroDestino,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: cuerpo },
                action: {
                    buttons: botones.map((b) => ({
                        type: 'reply',
                        reply: { id: b.id, title: b.title }
                    }))
                }
            }
        };

        try {
            logger.info(`[WA_OUT] -> Enviando botonera a ${numeroDestino}`);
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${config.meta.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
        } catch (error) {
            logger.error({ err: error.response?.data || error.message }, `Falla enviando botonera a WhatsApp para ${numeroDestino}`);
            throw error;
        }
    }

    async enviarMensajeWhatsApp(numeroDestino, mensaje) {
        const url = `https://graph.facebook.com/v18.0/${config.meta.phoneNumberId}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            to: numeroDestino,
            type: 'text',
            text: { body: mensaje }
        };

        try {
            logger.info(`[WA_OUT] -> Enviando mensaje a ${numeroDestino}`);
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${config.meta.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
        } catch (error) {
            logger.error({ err: error.response?.data || error.message }, `Falla enviando mensaje a WhatsApp para ${numeroDestino}`);
            throw error;
        }
    }
}

module.exports = new MessageService();