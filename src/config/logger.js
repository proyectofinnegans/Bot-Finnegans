const pino = require('pino');
const config = require('./env');

const isProduction = process.env.NODE_ENV === 'production';

// Serializer custom: un AxiosError completo trae socket, agent, certs, headers, etc.
// Eso explota cientos de líneas por error y satura Railway. Acá nos quedamos solo con lo accionable.
function errorSerializer(err) {
    if (!err || typeof err !== 'object') return err;

    const base = {
        type: err.name || 'Error',
        message: err.message,
        code: err.code,
        stack: err.stack
    };

    // AxiosError trae .isAxiosError === true
    if (err.isAxiosError) {
        return {
            ...base,
            type: 'AxiosError',
            method: err.config?.method,
            // No logueamos url completa (puede llevar tokens en query). Solo path + host.
            url: safeUrl(err.config?.url),
            status: err.response?.status,
            statusText: err.response?.statusText,
            responseData: truncate(err.response?.data, 500)
        };
    }

    return base;
}

function safeUrl(rawUrl) {
    if (!rawUrl) return undefined;
    try {
        const u = new URL(rawUrl);
        return `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
        return '[url-no-parseable]';
    }
}

function truncate(value, max) {
    if (value == null) return value;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return str.length > max ? `${str.slice(0, max)}...[truncado]` : str;
}

const logger = pino({
    level: config.logLevel,
    serializers: {
        err: errorSerializer,
        error: errorSerializer
    },
    redact: {
        paths: [
            'req.headers.authorization',
            '*.ACCESS_TOKEN',
            'err.config.url' // Por las dudas, sigue protegido si algo escapa al serializer
        ],
        censor: '[ENMASCARADO_POR_SEGURIDAD]'
    },
    // En producción: JSON puro (más liviano, parseable por Railway).
    // En desarrollo: pino-pretty para leerlo cómodo.
    ...(isProduction
        ? {}
        : {
              transport: {
                  target: 'pino-pretty',
                  options: { colorize: true, translateTime: 'SYS:standard' }
              }
          })
});

module.exports = logger;
