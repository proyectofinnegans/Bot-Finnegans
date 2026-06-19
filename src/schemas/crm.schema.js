const { z } = require('zod');

// Garantizamos el contrato de la API. Solo hacemos obligatorios los datos que rompen el bot si faltan.
const TicketSchema = z.object({
    CASO: z.string({
        required_error: "El campo CASO es obligatorio desde el CRM.",
        invalid_type_error: "El campo CASO debe ser un texto."
    }),
    ESTADO: z.string({
        required_error: "El campo ESTADO es obligatorio desde el CRM."
    }),
    TITULO: z.string().optional(),
    "RAMA PROPIETARIO 1": z.string().optional() // Usado para la detección de Partners
})
// passthrough() es CRÍTICO: le dice a Zod "si vienen otros 42 campos que no están en este objeto, dejalos pasar sin tirar error"
.passthrough(); 

// La API de reportes de Finnegans devuelve un array de objetos
const CrmResponseSchema = z.array(TicketSchema);

module.exports = { CrmResponseSchema };