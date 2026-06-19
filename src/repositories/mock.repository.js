const logger = require('../config/logger');

class MockRepository {
    constructor() {
        // Esta es la estructura base de 46 campos extraída de la documentación del CRM.
        // Sirve como "molde" para que todos los mocks tengan la misma forma que la API real.
        this.plantillaBase = {
            "FECHA FIN": "", "DOCUMENTO": "", "JIRA FECHA": "", "RAMA PROPIETARIO N": "",
            "COMPLEJIDAD": "Media", "HORAS PRESUPUESTADAS": "0", "CATEGORIA DE CONSULTA": "Soporte",
            "SF DESVIOSTANDARD": "", "NUEVOS COMENTARIOS": "", "RAMA APLICACION": "Finanzas",
            "ESTADO": "Abierto", "PROCESO": "Atención", "IDENTIFICACIONEXTERNA": "", "NOTAS": "",
            "PRESUPUESTO DE DESARROLLO": "0", "ACTIVIDAD": "", "DESVIO STANDARD": "",
            "FECHA ORIGEN": "2024-05-01", "FECHAENTREGACASO": "", "CONTACTO": "Juan Perez",
            "HORAS INVERSION": "0", "APLICACION": "Core", "FECHAREALIZACION": "",
            "EQUIPO": "Soporte N1", "CASO": "", "SERVICIOS DESVIOSTANDARD": "",
            "JIRA FECHA FINALIZADO": "", "PROYECTOITEM": "", "RAMA PROPIETARIO 3": "",
            "FECHA INICIO": "2024-05-01", "HORAS EJECUTADAS STANDARD": "0", "NRO JIRA": "",
            "NOVEDADES": "", "RAMA PROPIETARIO 2": "", "RESPONSABLE": "Equipo Soporte",
            "RAMA PROPIETARIO 1": "Cliente Directo", "ULTIMAACTIVIDAD": "",
            "ITEM DE PROYECTO": "", "HORAS CERTIFICABLES": "0", "LIDER DE PROYECTO": "",
            "PRIORIDAD": "Normal", "PROYECTO": "Mantenimiento", "ORGANIZACION": "Empresa S.A.",
            "TRANSACCIONID": "TRX-000", "TITULO": "", "JIRA ESTADO": "", "FECHAULTIMAACTIVIDAD": "2024-05-02"
        };
    }

    async obtenerEstadoTicket(numeroTicket) {
        logger.debug(`[MOCK DB] Buscando ticket ${numeroTicket} en base de datos simulada...`);
        
        // Creamos la base de datos aplicando nuestra plantilla a cada escenario
        const baseDeDatos = [
            { 
                ...this.plantillaBase, 
                CASO: "10001", 
                ESTADO: "Abierto", 
                TITULO: "Error en login al portal", 
                "RAMA PROPIETARIO 1": "Cliente Directo" 
            },
            { 
                ...this.plantillaBase, 
                CASO: "10002", 
                ESTADO: "Cerrado", 
                TITULO: "Facturación duplicada", 
                "RAMA PROPIETARIO 1": "Cliente Directo" 
            },
            { 
                ...this.plantillaBase, 
                CASO: "10003", 
                ESTADO: "En revisión", 
                TITULO: "Duda implementación módulo", 
                "RAMA PROPIETARIO 1": "Partner Consultores SA" // HU-11: Simula un cliente con partner
            }
        ];

        // Simulamos la latencia de red para que los tests de timeout (Axios) funcionen igual que en PROD
        await new Promise(resolve => setTimeout(resolve, 800)); 

        // Filtramos simulando el comportamiento de la API real
        const ticketCrudo = baseDeDatos.find(t => t.CASO === numeroTicket);

        if (ticketCrudo) {
            // Retornamos el objeto mapeado para que la capa de servicios lo consuma fácil
            return {
                encontrado: true,
                nroCaso: ticketCrudo.CASO,
                estado: ticketCrudo.ESTADO,
                titulo: ticketCrudo.TITULO || "Sin Asunto",
                partner: ticketCrudo["RAMA PROPIETARIO 1"] !== "Cliente Directo" ? ticketCrudo["RAMA PROPIETARIO 1"] : null
            };
        }
        
        return { encontrado: false };
    }
}

module.exports = new MockRepository();