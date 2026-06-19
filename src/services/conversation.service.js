const store = require('../store/conversation.store');
const messageService = require('./message.service');
const formatter = require('../utils/response.formatter');
const caseValidator = require('../utils/case.validator');
const logger = require('../config/logger');
const config = require('../config/env');

// Estados posibles de una conversación.
const ESTADOS = {
    ESPERANDO_NUMERO: 'esperando_numero',
    ESPERANDO_CONFIRMACION: 'resuelto_esperando_confirmacion'
};

// IDs de la botonera Sí/No del "¿Necesitás algo más?".
const BOTON_SI = 'algo_mas_si';
const BOTON_NO = 'algo_mas_no';

// Comando /ayuda. A DIFERENCIA del número de caso (que se EXTRAE de cualquier
// parte del mensaje porque es lenguaje natural), /ayuda es un COMANDO: tiene que
// ser el mensaje COMPLETO.
//
// Qué se acepta EXACTAMENTE (mensaje entero, tras trim + lower-case):
//   - "/ayuda"
//   - "ayuda"
// Variaciones de mayúsculas/minúsculas y espacios al borde están OK
// (" /Ayuda " también activa). NO se dispara si aparece embebido en una frase:
// "necesito ayuda con mi caso" NO activa el comando. Solo aplica a mensajes de
// texto (tipo 'text'); los botones nunca son comandos.
const COMANDOS_AYUDA = ['/ayuda', 'ayuda'];

function esComandoAyuda({ tipo, texto }) {
    if (tipo !== 'text') return false;
    const t = (texto || '').trim().toLowerCase();
    return COMANDOS_AYUDA.includes(t);
}

// Interpreta una respuesta Sí/No, sea por botón (botonId) o por texto suelto
// (el usuario que escribe "si"/"no" en vez de tocar el botón). Devuelve
// 'si' | 'no' | null.
function interpretarSiNo({ botonId, texto }) {
    if (botonId === BOTON_SI) return 'si';
    if (botonId === BOTON_NO) return 'no';

    const t = (texto || '').trim().toLowerCase();
    if (['si', 'sí', 's'].includes(t)) return 'si';
    if (['no', 'n'].includes(t)) return 'no';
    return null;
}

class ConversationService {
    /**
     * Punto de entrada de la capa de estado. Recibe un mensaje ya normalizado
     * por el controller: { from, tipo: 'text'|'boton', texto, botonId }.
     */
    async manejar({ from, tipo, texto, botonId }) {
        const ahora = Date.now();
        let convo = store.get(from);

        if (!convo) {
            // Conversación nueva.
            convo = {
                phone: from,
                estado: ESTADOS.ESPERANDO_NUMERO,
                saludado: false,
                createdAt: ahora,
                lastMessageAt: ahora
            };
            store.set(from, convo);
        } else {
            // Actualizamos actividad en cada mensaje entrante (clave para el barredor).
            convo.lastMessageAt = ahora;
            store.set(from, convo);
        }

        // Anti-spam: si el número está floodeando, absorbemos el mensaje y NO
        // respondemos nada a Meta (a lo sumo un único aviso al entrar en cooldown).
        // Va antes que /ayuda y que el ruteo de estado: cubre /ayuda spameado,
        // "hola hola hola" y cualquier flood de un solo número.
        const spam = this._aplicarAntiSpam(convo, ahora);
        store.set(from, convo);
        if (spam.bloquear) {
            if (spam.avisar) {
                try {
                    await messageService.enviarMensajeWhatsApp(from, formatter.templateEsperaMomento());
                } catch (err) {
                    logger.error({ err }, `Fallo avisando cooldown a ${from}`);
                }
            }
            return;
        }

        try {
            // Comando exacto /ayuda: responde la ayuda sin tocar el estado actual.
            if (esComandoAyuda({ tipo, texto })) {
                await messageService.enviarMensajeWhatsApp(from, formatter.templateAyuda());
                return;
            }

            if (convo.estado === ESTADOS.ESPERANDO_CONFIRMACION) {
                return await this._manejarConfirmacion(convo, { tipo, texto, botonId });
            }
            // Por defecto / esperando_numero.
            return await this._manejarEsperandoNumero(convo, { tipo, texto, botonId });
        } catch (err) {
            // No tiramos la conversación abajo por un fallo puntual de envío.
            logger.error({ err }, `Fallo manejando mensaje de ${from} en estado ${convo.estado}`);
        }
    }

    /**
     * Throttle por número sobre el MISMO objeto de conversación en memoria.
     * Cuenta mensajes en una ventana deslizante; si superan el umbral, arma un
     * cooldown durante el cual no se responde nada. Muta `convo` (el caller lo
     * persiste). Devuelve { bloquear, avisar }:
     *   - bloquear: true  → no seguir procesando este mensaje (no llamar a Meta).
     *   - avisar:   true  → mandar el ÚNICO aviso de "esperá un momento" (solo la
     *                       primera vez que entra en cooldown, no en cada mensaje).
     */
    _aplicarAntiSpam(convo, ahora) {
        const { spamMaxMessages, spamWindowMs, spamCooldownMs } = config.conversation;

        // Cooldown ya vencido → lo limpiamos y arrancamos ventana nueva.
        if (convo.cooldownUntil && ahora >= convo.cooldownUntil) {
            convo.cooldownUntil = null;
            convo.spamWindowStart = ahora;
            convo.spamCount = 0;
        }

        // Sigue dentro del cooldown → silencio total, ni una llamada a Meta.
        if (convo.cooldownUntil && ahora < convo.cooldownUntil) {
            return { bloquear: true, avisar: false };
        }

        // Conteo por ventana deslizante.
        if (!convo.spamWindowStart || ahora - convo.spamWindowStart > spamWindowMs) {
            convo.spamWindowStart = ahora;
            convo.spamCount = 1;
        } else {
            convo.spamCount++;
        }

        // Recién supera el umbral → entra en cooldown y avisa UNA sola vez.
        if (convo.spamCount > spamMaxMessages) {
            convo.cooldownUntil = ahora + spamCooldownMs;
            return { bloquear: true, avisar: true };
        }

        return { bloquear: false, avisar: false };
    }

    async _manejarEsperandoNumero(convo, { texto }) {
        const numero = caseValidator.extraerYValidar(texto);

        if (!numero) {
            // Validación de formato: SOLO corre en este estado.
            if (!convo.saludado) {
                // Primer contacto: saludo corto (no el menú largo viejo).
                convo.saludado = true;
                store.set(convo.phone, convo);
                await messageService.enviarMensajeWhatsApp(convo.phone, formatter.templateSaludoInicial());
            } else {
                await messageService.enviarMensajeWhatsApp(convo.phone, formatter.templateNoEntendi());
            }
            return;
        }

        // Número válido → resolvemos reutilizando la lógica de negocio intacta.
        const ticketService = require('./ticket.service'); // require interno: evita ciclo.
        const respuesta = await ticketService.consultarEstado(numero);
        await messageService.enviarMensajeWhatsApp(convo.phone, respuesta);

        // Tras resolver, pasamos a confirmación y ofrecemos "¿algo más?" (Feature 1).
        convo.estado = ESTADOS.ESPERANDO_CONFIRMACION;
        convo.saludado = true;
        convo.confirmacionReintentos = 0; // arranca limpio en este estado.
        store.set(convo.phone, convo);
        await this._enviarConfirmacion(convo.phone);
    }

    async _manejarConfirmacion(convo, { botonId, texto }) {
        const decision = interpretarSiNo({ botonId, texto });

        if (decision === 'si') {
            convo.estado = ESTADOS.ESPERANDO_NUMERO;
            convo.confirmacionReintentos = 0; // respuesta válida → resetea el contador.
            store.set(convo.phone, convo);
            await messageService.enviarMensajeWhatsApp(convo.phone, formatter.templatePedirNuevoNumero());
            return;
        }

        if (decision === 'no') {
            // Cierra y limpia el estado.
            store.delete(convo.phone);
            await messageService.enviarMensajeWhatsApp(convo.phone, formatter.templateCierreConversacion());
            return;
        }

        // Texto que no es Sí/No: en vez de re-mostrar la botonera infinitamente,
        // limitamos los reintentos. Tras confirmationMaxRetries mensajes inválidos
        // seguidos, cerramos con una despedida. Un "No" NUNCA cae acá; y nunca
        // corremos la validación de número.
        convo.confirmacionReintentos = (convo.confirmacionReintentos || 0) + 1;

        if (convo.confirmacionReintentos > config.conversation.confirmationMaxRetries) {
            store.delete(convo.phone);
            await messageService.enviarMensajeWhatsApp(convo.phone, formatter.templateCierrePorReintentos());
            return;
        }

        store.set(convo.phone, convo);
        await this._enviarConfirmacion(convo.phone);
    }

    async _enviarConfirmacion(phone) {
        await messageService.enviarBotones(phone, formatter.templateAlgoMas(), [
            { id: BOTON_SI, title: 'Sí' },
            { id: BOTON_NO, title: 'No' }
        ]);
    }
}

const instancia = new ConversationService();
instancia.ESTADOS = ESTADOS;
instancia.BOTON_SI = BOTON_SI;
instancia.BOTON_NO = BOTON_NO;

module.exports = instancia;
