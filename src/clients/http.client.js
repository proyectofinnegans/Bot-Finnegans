const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../config/logger');

const httpClient = axios.create({
    timeout: 5000, // Timeout estricto de 5s
});

axiosRetry(httpClient, {
    retries: 2,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        // Reintentos SOLO ante problemas transitorios: red caída, timeout o rate-limit.
        // 4xx (404, 400, 401, 403) son determinísticos: reintentar es perder tiempo y meter ruido.
        if (error.response) {
            return error.response.status === 429 || error.response.status >= 500;
        }
        return axiosRetry.isNetworkOrIdempotentRequestError(error);
    },
    onRetry: (retryCount, error) => {
        logger.warn(`Reintento ${retryCount} hacia upstream debido a: ${error.code || error.message}`);
    }
});

module.exports = httpClient;
