const finnegansClient = require('../clients/finnegans.client');
const { CrmResponseSchema } = require('../schemas/crm.schema');
const logger = require('../config/logger');

class FinnegansRepository {
    async obtenerEstadoTicket(numeroTicket) {
        const currentYear = new Date().getFullYear();
        const fechaDesde = `${currentYear}-01-01`;
        const fechaHasta = new Date().toISOString().split('T')[0];

        let rawData;
        try {
            rawData = await finnegansClient.getCasosCBG(fechaDesde, fechaHasta, numeroTicket);
        } catch (error) {
            // 404 del backend (típico de mockapi.io cuando el caso no existe) NO es un error real:
            // es la forma del proveedor de decir "no encontrado". Lo mapeamos como tal.
            if (error.response?.status === 404) {
                logger.info(`Ticket ${numeroTicket} no existe en el CRM (404)`);
                return { encontrado: false };
            }
            logger.error({ err: error }, 'Error de comunicación con CRM');
            throw new Error('Fallo al obtener ticket del CRM');
        }

        try {
            // Algunos proveedores devuelven {} o null cuando no hay resultados, en vez de [].
            // Normalizamos antes de validar con Zod.
            const dataset = Array.isArray(rawData) ? rawData : [];

            const parsedData = CrmResponseSchema.parse(dataset);

            if (parsedData.length === 0) {
                return { encontrado: false };
            }

            const ticket = parsedData[0];
            return {
                encontrado: true,
                nroCaso: ticket.CASO,
                estado: ticket.ESTADO,
                titulo: ticket.TITULO || "Sin Asunto",
                partner: ticket["RAMA PROPIETARIO 1"] !== "Cliente Directo" ? ticket["RAMA PROPIETARIO 1"] : null
            };
        } catch (error) {
            logger.error({ err: error }, 'Error procesando datos del CRM');
            throw new Error('Fallo al obtener ticket del CRM');
        }
    }
}

module.exports = new FinnegansRepository();
