require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || process.env.MOCK_PORT || 3002;

const plantillaBase = {
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

const baseDeDatos = [
    { ...plantillaBase, CASO: "10001", ESTADO: "Abierto", TITULO: "Error en login al portal", "RAMA PROPIETARIO 1": "Cliente Directo" },
    { ...plantillaBase, CASO: "10002", ESTADO: "Cerrado", TITULO: "Facturación duplicada", "RAMA PROPIETARIO 1": "Cliente Directo" },
    { ...plantillaBase, CASO: "10003", ESTADO: "En revisión", TITULO: "Duda implementación módulo", "RAMA PROPIETARIO 1": "Partner Consultores SA" }
];

app.get('/api/reports/CasosCBG', async (req, res) => {
    const { PARAMNumeroInterno } = req.query;
    console.log(`[MOCK API] GET /api/reports/CasosCBG nroCaso=${PARAMNumeroInterno}`);

    await new Promise(r => setTimeout(r, 800));

    if (!PARAMNumeroInterno) return res.json(baseDeDatos);

    const resultado = baseDeDatos.filter(t => t.CASO === String(PARAMNumeroInterno));
    res.json(resultado);
});

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'mock-finnegans' }));

app.listen(PORT, () => {
    console.log(`[MOCK API] Servidor mock Finnegans escuchando en http://localhost:${PORT}`);
});
