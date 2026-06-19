// Usamos require() (no import) a propósito: la capa de conversación toma sus
// dependencias (store, message.service, ticket.service) por require interno.
// Compartir la misma caché de módulos garantiza que los spies y el store del
// test sean exactamente las instancias que usa el servicio.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const conversationService = require('../src/services/conversation.service');
const messageService = require('../src/services/message.service');
const ticketService = require('../src/services/ticket.service');
const store = require('../src/store/conversation.store');
const formatter = require('../src/utils/response.formatter');
const config = require('../src/config/env');

const TEL = '549110001';

describe('ConversationService — máquina de estados', () => {
    let envia, botones, consulta;

    beforeEach(() => {
        store.clear();
        envia = vi.spyOn(messageService, 'enviarMensajeWhatsApp').mockResolvedValue();
        botones = vi.spyOn(messageService, 'enviarBotones').mockResolvedValue();
        consulta = vi.spyOn(ticketService, 'consultarEstado').mockResolvedValue('ESTADO_DEL_CASO');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('primer contacto sin número válido: saluda corto y queda en esperando_numero', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });

        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateSaludoInicial());
        const convo = store.get(TEL);
        expect(convo.estado).toBe('esperando_numero');
        expect(convo.saludado).toBe(true);
        expect(consulta).not.toHaveBeenCalled();
    });

    it('saludo inicial (primer mensaje sin número): menciona el comando /ayuda', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });

        const [, mensaje] = envia.mock.calls.find(([dest]) => dest === TEL);
        expect(mensaje).toContain('/ayuda');
    });

    it('primer mensaje con número de caso válido: NO saluda ni menciona /ayuda, resuelve directo', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'mi caso es 12345' });

        expect(consulta).toHaveBeenCalledWith('12345');
        expect(envia).not.toHaveBeenCalledWith(TEL, formatter.templateSaludoInicial());
        // Ninguno de los mensajes enviados arrastra la mención de /ayuda del saludo.
        const menciona = envia.mock.calls.some(([, msg]) => typeof msg === 'string' && msg.includes('/ayuda'));
        expect(menciona).toBe(false);
    });

    it('el reprompt "no te entendí" NO repite la mención de /ayuda', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });
        envia.mockClear();

        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'asdf' });

        const [, mensaje] = envia.mock.calls.find(([dest]) => dest === TEL);
        expect(mensaje).not.toContain('/ayuda');
    });

    it('segundo input inválido en esperando_numero: responde "no te entendí" (no repite menú)', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });
        envia.mockClear();

        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'asdf' });

        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateNoEntendi());
        expect(store.get(TEL).estado).toBe('esperando_numero');
    });

    it('número válido: consulta el caso, responde y ofrece botonera Sí/No', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'mi caso es 12345' });

        expect(consulta).toHaveBeenCalledWith('12345');
        expect(envia).toHaveBeenCalledWith(TEL, 'ESTADO_DEL_CASO');
        expect(botones).toHaveBeenCalledWith(
            TEL,
            formatter.templateAlgoMas(),
            expect.arrayContaining([
                expect.objectContaining({ id: 'algo_mas_si' }),
                expect.objectContaining({ id: 'algo_mas_no' })
            ])
        );
        expect(store.get(TEL).estado).toBe('resuelto_esperando_confirmacion');
    });

    it('confirmación + Sí: vuelve a esperando_numero y pide nuevo número', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1 });

        await conversationService.manejar({ from: TEL, tipo: 'boton', texto: 'Sí', botonId: 'algo_mas_si' });

        expect(envia).toHaveBeenCalledWith(TEL, formatter.templatePedirNuevoNumero());
        expect(store.get(TEL).estado).toBe('esperando_numero');
    });

    it('confirmación + No: cierra y limpia el estado del store', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1 });

        await conversationService.manejar({ from: TEL, tipo: 'boton', texto: 'No', botonId: 'algo_mas_no' });

        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateCierreConversacion());
        expect(store.get(TEL)).toBeNull();
    });

    it('la validación de formato SOLO corre en esperando_numero: un "No" en confirmación no cae en "no te entendí"', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1 });

        // "no" como texto suelto (sin botón) se interpreta como cierre, nunca como número inválido.
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'no' });

        expect(envia).not.toHaveBeenCalledWith(TEL, formatter.templateNoEntendi());
        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateCierreConversacion());
        expect(consulta).not.toHaveBeenCalled();
    });

    it('confirmación + texto que no es Sí/No: re-ofrece la botonera, no valida número', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1 });

        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'cualquier cosa' });

        expect(botones).toHaveBeenCalledWith(TEL, formatter.templateAlgoMas(), expect.any(Array));
        expect(envia).not.toHaveBeenCalledWith(TEL, formatter.templateNoEntendi());
        expect(consulta).not.toHaveBeenCalled();
        expect(store.get(TEL).estado).toBe('resuelto_esperando_confirmacion');
    });

    it('actualiza lastMessageAt en cada mensaje entrante', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-08T10:00:00Z'));
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });
        const t1 = store.get(TEL).lastMessageAt;

        vi.setSystemTime(new Date('2026-06-08T10:05:00Z'));
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'asdf' });
        const t2 = store.get(TEL).lastMessageAt;

        expect(t2).toBeGreaterThan(t1);
        vi.useRealTimers();
    });
});

describe('ConversationService — comando /ayuda (exacto, no extraído)', () => {
    let envia, botones, consulta;

    beforeEach(() => {
        store.clear();
        envia = vi.spyOn(messageService, 'enviarMensajeWhatsApp').mockResolvedValue();
        botones = vi.spyOn(messageService, 'enviarBotones').mockResolvedValue();
        consulta = vi.spyOn(ticketService, 'consultarEstado').mockResolvedValue('ESTADO_DEL_CASO');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('"/ayuda" como mensaje completo activa el comando y responde la ayuda', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: '/ayuda' });

        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateAyuda());
        expect(consulta).not.toHaveBeenCalled();
    });

    it('"ayuda" (sin barra, con mayúsculas y espacios) también activa', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: '  Ayuda ' });

        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateAyuda());
    });

    it('/ayuda embebido en una frase NO activa el comando', async () => {
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'necesito ayuda con mi caso' });

        expect(envia).not.toHaveBeenCalledWith(TEL, formatter.templateAyuda());
        // Cae en el flujo normal: primer contacto → saludo inicial.
        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateSaludoInicial());
    });

    it('un botón con title "ayuda" NO se interpreta como comando (solo texto)', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1 });

        await conversationService.manejar({ from: TEL, tipo: 'boton', texto: 'ayuda', botonId: 'algo_mas_si' });

        expect(envia).not.toHaveBeenCalledWith(TEL, formatter.templateAyuda());
    });
});

describe('ConversationService — anti-spam / cooldown por número (tiempo mockeado)', () => {
    let envia;
    const BASE = Date.UTC(2026, 5, 9, 10, 0, 0);
    const MAX = config.conversation.spamMaxMessages;
    const COOLDOWN = config.conversation.spamCooldownMs;

    beforeEach(() => {
        store.clear();
        envia = vi.spyOn(messageService, 'enviarMensajeWhatsApp').mockResolvedValue();
        vi.spyOn(messageService, 'enviarBotones').mockResolvedValue();
        vi.spyOn(ticketService, 'consultarEstado').mockResolvedValue('ESTADO_DEL_CASO');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('flood: supera el umbral → entra en cooldown (un único aviso) → no manda más hasta que pasa', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(BASE);

        // Hasta el umbral: el bot sigue respondiendo normal.
        for (let i = 0; i < MAX; i++) {
            await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });
        }
        expect(envia).not.toHaveBeenCalledWith(TEL, formatter.templateEsperaMomento());

        // El mensaje que supera el umbral → entra en cooldown con UN solo aviso.
        envia.mockClear();
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola' });
        expect(envia).toHaveBeenCalledTimes(1);
        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateEsperaMomento());

        // Durante el cooldown: silencio total, ni el aviso se repite.
        envia.mockClear();
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'hola hola' });
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: '/ayuda' });
        expect(envia).not.toHaveBeenCalled();

        // Pasado el cooldown: vuelve a responder.
        vi.setSystemTime(BASE + COOLDOWN + 1000);
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: '/ayuda' });
        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateAyuda());
    });
});

describe('ConversationService — tope de reintentos en confirmación', () => {
    let envia, botones;
    const MAXR = config.conversation.confirmationMaxRetries;

    beforeEach(() => {
        store.clear();
        envia = vi.spyOn(messageService, 'enviarMensajeWhatsApp').mockResolvedValue();
        botones = vi.spyOn(messageService, 'enviarBotones').mockResolvedValue();
        vi.spyOn(ticketService, 'consultarEstado').mockResolvedValue('ESTADO_DEL_CASO');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('llega al tope de reintentos → cierra con despedida y limpia el estado', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1, confirmacionReintentos: 0 });

        // Los primeros MAXR mensajes inválidos re-muestran la botonera.
        for (let i = 0; i < MAXR; i++) {
            await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'cualquier cosa' });
            expect(store.get(TEL)).not.toBeNull();
        }
        expect(botones).toHaveBeenCalledTimes(MAXR);

        // El siguiente inválido supera el tope → cierra.
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'cualquier cosa' });
        expect(envia).toHaveBeenCalledWith(TEL, formatter.templateCierrePorReintentos());
        expect(store.get(TEL)).toBeNull();
    });

    it('respuesta válida antes del tope resetea el contador de reintentos', async () => {
        store.set(TEL, { phone: TEL, estado: 'resuelto_esperando_confirmacion', saludado: true, lastMessageAt: 1, confirmacionReintentos: 0 });

        // Dos inválidos: el contador sube.
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'cualquier cosa' });
        await conversationService.manejar({ from: TEL, tipo: 'text', texto: 'otra cosa' });
        expect(store.get(TEL).confirmacionReintentos).toBe(2);

        // Respuesta válida (Sí): resetea el contador y vuelve a esperando_numero.
        await conversationService.manejar({ from: TEL, tipo: 'boton', texto: 'Sí', botonId: 'algo_mas_si' });
        expect(store.get(TEL).estado).toBe('esperando_numero');
        expect(store.get(TEL).confirmacionReintentos).toBe(0);
    });
});
