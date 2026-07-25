const express = require('express');
const router = express.Router();
const controller = require('../controllers/agentPersonasController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.get('/', controller.getPersonas);
router.post('/hire', controller.hirePersona);

module.exports = router;
