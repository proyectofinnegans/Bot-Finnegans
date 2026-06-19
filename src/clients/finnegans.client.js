const httpClient = require('./http.client');
const config = require('../config/env');
const logger = require('../config/logger');

// mockapi.io no permite espacios en los nombres de campo, así que los guarda con `_`.
// Reconstruimos el formato real (con espacios) para que el resto del sistema no se entere.
function normalizarKeysMock(payload) {
    if (Array.isArray(payload)) return payload.map(normalizarKeysMock);
    if (payload && typeof payload === 'object') {
        return Object.fromEntries(
            Object.entries(payload).map(([k, v]) => [k.replace(/_/g, ' '), v])
        );
    }
    return payload;
}

class FinnegansClient {
    async getCasosCBG(fechaDesde, fechaHasta, numeroInterno) {
        let url;
        if (config.useMockData) {
            url = `${config.finnegans.apiUrl}/casos?CASO=${encodeURIComponent(numeroInterno)}`;
        } else {
            const params = new URLSearchParams({
                ACCESS_TOKEN: config.finnegans.accessToken,
                PARAMCasosDesde: fechaDesde,
                PARAMCasosHasta: fechaHasta,
                PARAMNumeroInterno: numeroInterno
            });
            url = `${config.finnegans.apiUrl}/reports/CasosCBG?${params.toString()}`;
        }

        try {
            logger.debug(`Ejecutando petición GET a Finnegans para ticket ${numeroInterno}`);
            const response = await httpClient.get(url);
            return config.useMockData ? normalizarKeysMock(response.data) : response.data;
        } catch (error) {
            logger.error({ err: error }, `Falla crítica comunicando con API Finnegans para ticket ${numeroInterno}`);
            throw error;
        }
    }
}

module.exports = new FinnegansClient();