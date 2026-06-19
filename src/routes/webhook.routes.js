const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

router.get('/webhook', (req, res) => webhookController.verificarWebhook(req, res));
router.post('/webhook', (req, res) => webhookController.recibirMensaje(req, res));

module.exports = router;