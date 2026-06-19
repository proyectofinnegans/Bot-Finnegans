import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../src/store/conversation.store';

describe('InMemoryStore', () => {
    let store;

    beforeEach(() => {
        store = new InMemoryStore();
    });

    it('get devuelve null cuando no existe la conversación', () => {
        expect(store.get('549110000')).toBeNull();
    });

    it('set + get persisten la conversación por número', () => {
        const convo = { phone: '111', estado: 'esperando_numero', lastMessageAt: 1 };
        store.set('111', convo);
        expect(store.get('111')).toEqual(convo);
        expect(store.size()).toBe(1);
    });

    it('delete elimina la conversación del store', () => {
        store.set('111', { phone: '111' });
        expect(store.delete('111')).toBe(true);
        expect(store.get('111')).toBeNull();
        expect(store.size()).toBe(0);
    });

    it('listActive devuelve todas las conversaciones activas', () => {
        store.set('111', { phone: '111' });
        store.set('222', { phone: '222' });
        const activas = store.listActive();
        expect(activas).toHaveLength(2);
        expect(activas.map((c) => c.phone).sort()).toEqual(['111', '222']);
    });

    it('listActive permite borrar mientras se itera sin romper el recorrido', () => {
        store.set('111', { phone: '111' });
        store.set('222', { phone: '222' });
        let recorridas = 0;
        for (const convo of store.listActive()) {
            recorridas++;
            store.delete(convo.phone);
        }
        expect(recorridas).toBe(2);
        expect(store.size()).toBe(0);
    });
});
