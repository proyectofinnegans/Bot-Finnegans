const config = require('../config/env');

// Valida el FORMATO del número de caso por regex de dígitos (largo esperado),
// no contando caracteres a lo bruto. El rango es configurable por env var
// (CASE_MIN_DIGITS / CASE_MAX_DIGITS). Los casos reales/mock son de 5 dígitos.
const { caseMinDigits, caseMaxDigits } = config.conversation;
const PATRON_CASO = new RegExp(`^\\d{${caseMinDigits},${caseMaxDigits}}$`);

/**
 * Extrae un bloque de dígitos del texto y valida que cumpla el formato.
 * @returns {string|null} el número de caso válido, o null si no valida.
 */
const extraerYValidar = (texto) => {
    const limpio = (texto || '').trim();
    const match = limpio.match(/\d+/);
    if (!match) return null;

    const candidato = match[0];
    return PATRON_CASO.test(candidato) ? candidato : null;
};

module.exports = { extraerYValidar, PATRON_CASO };
