import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSweeper } from '../src/services/conversation.sweeper';
import { InMemoryStore } from '../src/store/conversation.store';
import formatter from '../src/utils/response.formatter';

const INACTIVIDAD = 5 * 60 * 1000; // 5 min
const INTERVALO = 60 * 1000; // 1 min

function nuevaConvo(phone, lastMessageAt) {
    return { phone, estado: 'esperando_numero', saludado: true, createdAt: lastMessageAt, lastMessageAt };
}

describe('conversation.sweeper — barrido con tiempo mockeado', () => {
    let store, sender, ahora;

    beforeEach(() => {
        store = new InMemoryStore();
        sender = { enviarMensajeWhatsApp: vi.fn().mockResolvedValue() };
        ahora = 1_000_000; // base de tiempo controlada
    });

    function crear() {
        return createSweeper({
            store,
            sender,
            inactivityMs: INACTIVIDAD,
            intervalMs: INTERVALO,
            clock: () => ahora
        });
    }

    it('cierra y LIMPIA del Map las conversaciones vencidas + avisa por Meta', async () => {
        store.set('111', nuevaConvo('111', ahora));
        const sweeper = crear();

        ahora += INACTIVIDAD + 1; // vencida
        await sweeper.tick();

        expect(store.get('111')).toBeNull();
        expect(store.size()).toBe(0);
        expect(sender.enviarMensajeWhatsApp).toHaveBeenCalledWith('111', formatter.templateCierrePorInactividad());
    });

    it('NO toca conversaciones todavía activas', async () => {
        store.set('111', nuevaConvo('111', ahora));
        const sweeper = crear();

        ahora += INACTIVIDAD - 1; // aún dentro de la ventana
        await sweeper.tick();

        expect(store.get('111')).not.toBeNull();
        expect(sender.enviarMensajeWhatsApp).not.toHaveBeenCalled();
    });

    it('si falla el aviso por Meta, igual borra del Map y sigue con las demás', async () => {
        sender.enviarMensajeWhatsApp.mockRejectedValue(new Error('usuario bloqueó al bot'));
        store.set('111', nuevaConvo('111', ahora));
        store.set('222', nuevaConvo('222', ahora));
        const sweeper = crear();

        ahora += INACTIVIDAD + 1;
        await expect(sweeper.tick()).resolves.not.toThrow();

        // Ambas limpiadas pese al fallo del aviso.
        expect(store.size()).toBe(0);
        expect(sender.enviarMensajeWhatsApp).toHaveBeenCalledTimes(2);
    });

    it('el interval registrado se puede frenar con stop() (no queda huérfano)', async () => {
        store.set('111', nuevaConvo('111', ahora));
        const sweeper = crear();

        vi.useFakeTimers();
        sweeper.start();

        ahora += INACTIVIDAD + 1;
        await vi.advanceTimersByTimeAsync(INTERVALO); // dispara un tick
        expect(store.size()).toBe(0);

        sweeper.stop();

        // Tras stop, una nueva conversación vencida no se procesa: el interval murió.
        store.set('222', nuevaConvo('222', ahora));
        ahora += INACTIVIDAD + 1;
        await vi.advanceTimersByTimeAsync(INTERVALO * 5);
        expect(store.get('222')).not.toBeNull();

        vi.useRealTimers();
    });

    it('start() es idempotente: no crea más de un interval', () => {
        const sweeper = crear();
        vi.useFakeTimers();
        const h1 = sweeper.start();
        const h2 = sweeper.start();
        expect(h1).toBe(h2);
        sweeper.stop();
        vi.useRealTimers();
    });
});
