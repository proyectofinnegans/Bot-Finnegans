require('dotenv').config();

const useMockData = process.env.USE_MOCK_DATA === 'true';

module.exports = {
    port: process.env.PORT || 3000,
    useMockData,
    logLevel: process.env.LOG_LEVEL || 'info',
    meta: {
        verifyToken: process.env.META_VERIFY_TOKEN,
        accessToken: process.env.META_ACCESS_TOKEN,
        phoneNumberId: process.env.META_PHONE_ID
    },
    finnegans: {
        apiUrl: useMockData
            ? (process.env.MOCK_API_URL || 'http://localhost:3002/api')
            : process.env.FINNEGANS_API_URL,
        accessToken: useMockData
            ? 'mock-token'
            : process.env.FINNEGANS_ACCESS_TOKEN
    },
    // Capa de estado de conversación (en memoria). Todo configurable por env.
    conversation: {
        // Inactividad antes de que el barredor cierre la conversación. Default 5 min.
        inactivityMs: (Number(process.env.CONVERSATION_INACTIVITY_MINUTES) || 5) * 60 * 1000,
        // Cada cuánto corre el barredor único. Default 60 s.
        sweepIntervalMs: (Number(process.env.CONVERSATION_SWEEP_SECONDS) || 60) * 1000,
        // Formato del número de caso. Los reales/mock son de 5 dígitos; default 4-8 para no romper.
        caseMinDigits: Number(process.env.CASE_MIN_DIGITS) || 4,
        caseMaxDigits: Number(process.env.CASE_MAX_DIGITS) || 8,
        // Anti-spam / throttle por número. Si un mismo número manda más de
        // spamMaxMessages mensajes dentro de spamWindowMs, entra en cooldown
        // (spamCooldownMs) durante el cual el bot NO responde nada a Meta.
        spamMaxMessages: Number(process.env.SPAM_MAX_MESSAGES) || 5,
        spamWindowMs: (Number(process.env.SPAM_WINDOW_SECONDS) || 10) * 1000,
        spamCooldownMs: (Number(process.env.SPAM_COOLDOWN_SECONDS) || 30) * 1000,
        // Tope de reintentos en 'resuelto_esperando_confirmacion': tras esta
        // cantidad de mensajes que no son Sí/No, el bot cierra en vez de
        // re-mostrar la botonera infinitamente. Se resetea con una respuesta válida.
        confirmationMaxRetries: Number(process.env.CONFIRMATION_MAX_RETRIES) || 3
    }
};
