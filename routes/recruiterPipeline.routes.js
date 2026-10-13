const express = require('express');
const { authenticate, requireRecruiter } = require('../middleware/auth'); // team lead's JWT + RBAC middleware
const { updateApplicationStatus } = require('../controllers/recruiterStatus.controller');

const router = express.Router();

router.patch('/applications/:applicationId/status', authenticate, requireRecruiter, updateApplicationStatus);

module.exports = router;
