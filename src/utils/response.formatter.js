// Plantillas puras

// Estados que se consideran "cerrados". Comparación case-insensitive.
const ESTADOS_CERRADOS = ['cerrado', 'resuelto', 'finalizado'];

const templateEstadoCaso = (ticket) => {
    const estaCerrado = ESTADOS_CERRADOS.includes((ticket.estado || '').toLowerCase());

    if (estaCerrado) {
        // Escenario B — Caso Cerrado / Resuelto
        return `Tu caso ya fue resuelto por nuestro equipo técnico:\n\n` +
            `📄 *Caso:* #${ticket.nroCaso}\n` +
            `📋 *Asunto:* ${ticket.titulo}\n` +
            `✅ *Estado actual:* ${ticket.estado}\n\n` +
            `Si considerás que el inconveniente persiste o necesitás agregar algo más, recordá que podés reabrirlo directamente desde el Portal de Casos.`;
    }

    // Escenario A — Caso Abierto / En Proceso / cualquier otro estado activo
    return `Encontré tu gestión. Este es el detalle actual:\n\n` +
        `📄 *Caso:* #${ticket.nroCaso}\n` +
        `📋 *Asunto:* ${ticket.titulo}\n` +
        `⏳ *Estado actual:* ${ticket.estado}\n\n` +
        `Nuestro equipo técnico se encuentra trabajando en la solución. En cuanto tengamos novedades, te notificaremos a través del Portal.`;
};

const templatePartner = (ticket) => {
    return `Identifiqué que tu caso #${ticket.nroCaso} está asignado y siendo gestionado de forma directa por tu *Partner asociado*.\n\n` +
        `Por favor, ponete en contacto con ellos para que puedan brindarte un seguimiento detallado y las últimas novedades sobre el avance.`;
};

const templateErrorValidacion = () => {
    return `¡Hola! Te damos la bienvenida al asistente virtual de soporte. 🤖\n\n` +
        `Estoy para ayudarte a conocer el estado de tus gestiones. Esto es lo que puedo hacer:\n\n` +
        `📋 *Consultar el estado de un caso*\n` +
        `Escribí *únicamente el número* (por ejemplo: 12345) y te muestro su estado actual.\n\n` +
        `🔎 *¿No tenés el número a mano?*\n` +
        `Mirá cómo consultar tus casos acá: https://bc.finneg.com/t/portal-de-casos-como-generar-y-ver-tus-casos/1379\n\n` +
        `🤝 *¿Trabajás con un partner asociado?*\n` +
        `Las consultas y el seguimiento se gestionan directamente por esa vía.`;
};

const templateNoEncontrado = (numero) => {
    return `Estuve buscando el caso #${numero}, pero no logré encontrarlo en nuestros registros actuales.\n\n` +
        `Por favor, verificá que los números ingresados sean correctos e intentá de nuevo. Si el error persiste, te sugerimos revisar el Portal de Casos para confirmar el número exacto.`;
};

const templateErrorSistema = () => {
    return `En este momento estamos experimentando una breve interrupción en la conexión con nuestro sistema de consultas.\n\n` +
        `Por favor, aguardá unos minutos e intentá nuevamente. Disculpá las molestias ocasionadas.`;
};

const templateFormatoNoSoportado = () => {
    return `Disculpame, todavía no puedo procesar mensajes de voz, imágenes ni archivos. 🙏\n\n` +
        `Para poder ayudarte, escribime *únicamente los dígitos del número de tu caso* (por ejemplo: 12345). ¡Gracias!`;
};

// --- Capa de conversación ---

// Saludo inicial corto: a propósito NO repetimos el menú largo en cada input inválido.
const templateSaludoInicial = () => {
    return `¡Hola! 🤖 Soy el asistente de soporte.\n\n` +
        `Pasame el *número de caso* que querés consultar (por ejemplo: 12345).\n\n` +
        `ℹ️ Si necesitás más información, escribí */ayuda*.`;
};

// Reprompt cuando el input no valida (ya en conversación).
const templateNoEntendi = () => {
    return `No te entendí. 🙈 Mandá un *número de caso válido* (por ejemplo: 12345).`;
};

// Pregunta de cierre con botonera Sí/No (Feature 1).
const templateAlgoMas = () => {
    return `¿Necesitás algo más?`;
};

// Prompt para pedir un nuevo número tras un "Sí".
const templatePedirNuevoNumero = () => {
    return `¡Perfecto! 🙌 Pasame el *número del caso* que querés consultar.`;
};

// Cierre por elección del usuario ("No").
const templateCierreConversacion = () => {
    return `¡Gracias por comunicarte! 👋 Cerramos la consulta.\n\n` +
        `Si necesitás algo más, escribime cuando quieras y arrancamos de nuevo.`;
};

// Aviso de cierre por inactividad (lo dispara el barredor).
const templateCierrePorInactividad = () => {
    return `Cerré la conversación por inactividad. ⌛\n\n` +
        `Cuando quieras retomar, escribime el *número de tu caso* y te ayudo. 👋`;
};

// Respuesta al comando exacto /ayuda (ver conversation.service).
const templateAyuda = () => {
    return `🤖 *Asistente de soporte — ayuda*\n\n` +
        `Esto es lo que puedo hacer:\n\n` +
        `📋 *Consultar el estado de un caso*\n` +
        `Escribí *únicamente el número* (por ejemplo: 12345) y te muestro su estado actual.\n\n` +
        `🔎 *¿No tenés el número a mano?*\n` +
        `Mirá cómo consultar tus casos acá: https://bc.finneg.com/t/portal-de-casos-como-generar-y-ver-tus-casos/1379\n\n` +
        `🤝 *¿Trabajás con un partner asociado?*\n` +
        `Las consultas y el seguimiento se gestionan directamente por esa vía.\n\n` +
        `Escribí */ayuda* en cualquier momento para volver a ver esto.`;
};

// Aviso ÚNICO al entrar en cooldown por flood (anti-spam). No se repite por mensaje.
const templateEsperaMomento = () => {
    return `Estoy recibiendo muchos mensajes tuyos muy seguidos. 🙏\n\n` +
        `Esperá un momentito y volvé a escribirme. Te leo en cuanto pase. ⏳`;
};

// Cierre por exceso de respuestas inválidas en la confirmación Sí/No.
const templateCierrePorReintentos = () => {
    return `No logré entender tu respuesta, así que cierro la consulta por ahora. 👋\n\n` +
        `Cuando quieras, escribime el *número de tu caso* y arrancamos de nuevo.`;
};

module.exports = {
    templateEstadoCaso,
    templatePartner,
    templateErrorValidacion,
    templateNoEncontrado,
    templateErrorSistema,
    templateFormatoNoSoportado,
    templateSaludoInicial,
    templateNoEntendi,
    templateAlgoMas,
    templatePedirNuevoNumero,
    templateCierreConversacion,
    templateCierrePorInactividad,
    templateAyuda,
    templateEsperaMomento,
    templateCierrePorReintentos
};
