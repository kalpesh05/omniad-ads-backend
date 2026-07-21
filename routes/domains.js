const express = require('express');
const DomainController = require('../controllers/domainController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, DomainController.getDomains);
router.post('/', authenticateToken, DomainController.addDomain);
router.post('/:id/verify', authenticateToken, DomainController.verifyDomain);
router.delete('/:id', authenticateToken, DomainController.deleteDomain);

module.exports = router;
