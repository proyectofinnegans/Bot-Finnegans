// Aísla la lógica de detección de intención (Regex)
const extraerNumeroCaso = (texto) => {
    // Busca exactamente un bloque de números continuos. Ej: "mi caso es el 12345" -> "12345"
    const match = texto.match(/\b\d{4,8}\b/);
    return match ? match[0] : null;
};

module.exports = { extraerNumeroCaso };