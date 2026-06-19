const config = require('../config/env');
const logger = require('../config/logger');
const finnegansRepo = require('./finnegans.repository');

class RepositoryFactory {
    static getTicketRepository() {
        if (config.useMockData) {
            logger.info("Fábrica inyectando -> FinnegansRepository (apuntando a MOCK API)");
        } else {
            logger.info("Fábrica inyectando -> FinnegansRepository (apuntando a API REAL)");
        }
        return finnegansRepo;
    }
}

module.exports = RepositoryFactory;
