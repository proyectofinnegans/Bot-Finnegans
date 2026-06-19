// Capa de almacenamiento de estado de conversación.
//
// IMPORTANTE: la lógica de conversación NUNCA toca el Map directo. Habla solo
// con esta interfaz (get / set / delete / listActive). El día de mañana, para
// migrar a un back (Redis, DB, etc.), se reemplaza SOLO la implementación de
// abajo sin tocar la máquina de estados ni el barredor.

/**
 * Forma de una conversación almacenada:
 * {
 *   phone: string,            // clave (número del usuario en WhatsApp)
 *   estado: string,           // 'esperando_numero' | 'resuelto_esperando_confirmacion'
 *   saludado: boolean,        // si ya mostramos el saludo inicial corto
 *   createdAt: number,        // epoch ms
 *   lastMessageAt: number,    // epoch ms, se actualiza en cada mensaje entrante
 *
 *   // Anti-spam / throttle por número (ventana deslizante + cooldown):
 *   spamWindowStart: number,  // epoch ms, inicio de la ventana de conteo actual
 *   spamCount: number,        // mensajes contados dentro de la ventana actual
 *   cooldownUntil: number,    // epoch ms hasta el cual NO respondemos (0/null = sin cooldown)
 *
 *   // Tope de reintentos en la confirmación Sí/No:
 *   confirmacionReintentos: number  // mensajes no-Sí/No seguidos en ese estado
 * }
 */

class InMemoryStore {
    constructor() {
        this._map = new Map();
    }

    get(phone) {
        return this._map.get(phone) || null;
    }

    set(phone, conversacion) {
        this._map.set(phone, conversacion);
        return conversacion;
    }

    delete(phone) {
        return this._map.delete(phone);
    }

    // Devuelve una copia del listado para que el barredor pueda borrar mientras
    // itera sin invalidar el recorrido.
    listActive() {
        return Array.from(this._map.values());
    }

    // Helpers de soporte (tests / observabilidad). No los usa la lógica de negocio.
    size() {
        return this._map.size;
    }

    clear() {
        this._map.clear();
    }
}

// Exportamos el singleton (lo usa la app) y la clase (para instanciar limpio en tests).
module.exports = new InMemoryStore();
module.exports.InMemoryStore = InMemoryStore;
