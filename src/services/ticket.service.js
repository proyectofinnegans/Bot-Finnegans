const RepositoryFactory = require('../repositories/repository.factory');
const formatter = require('../utils/response.formatter');
const logger = require('../config/logger');

class TicketService {
    async consultarEstado(numeroIngresado) {
        try {
            const ticketRepo = RepositoryFactory.getTicketRepository();
            const resultado = await ticketRepo.obtenerEstadoTicket(numeroIngresado);
            
            if (!resultado.encontrado) {
                return formatter.templateNoEncontrado(numeroIngresado);
            }

            // Regla de Negocio: Redirección si tiene Partner
            if (resultado.partner) {
                logger.info(`Ticket ${numeroIngresado} desviado por regla de Partner (${resultado.partner})`);
                return formatter.templatePartner(resultado);
            }

            return formatter.templateEstadoCaso(resultado);

        } catch (error) {
            logger.error({ err: error }, `Fallo en el servicio de tickets para el nro ${numeroIngresado}`);
            return formatter.templateErrorSistema();
        }
    }
}

module.exports = new TicketService();