/**
 * Member Routes
 * Handles all routes related to library members
 */

const express = require('express');
const { memberController } = require('../controllers');
const { authMiddleware, validationMiddleware } = require('../middleware');
const { 
  authenticate, 
  requireStaff 
} = authMiddleware;
const { 
  validateRequiredFields, 
  validateIdParam,
  validateEmail 
} = validationMiddleware;

const router = express.Router();

// Public routes - no authentication required
// Member authentication by credential (PIN/QR code) or email/PIN combination
router.post('/member-login', validateRequiredFields(['email', 'pin']), memberController.authenticateMember);
router.post('/qr-login', validateRequiredFields(['qr_code']), memberController.authenticateByQRCode);

// Member-accessible routes - require authentication but not staff role
router.use(authenticate);

// Member-specific operations with ID parameter
// These routes can be accessed by the authenticated member or by staff
router.get('/:id/statistics', validateIdParam('id'), memberController.getMemberStatistics);
router.get('/:id/stats', validateIdParam('id'), memberController.getMemberStatistics); // Alias for backward compatibility
router.get('/:id/stats-debug', validateIdParam('id'), memberController.getMemberStatsDebug); // Debug route for troubleshooting
router.get('/:id/loans', validateIdParam('id'), memberController.getMemberLoans);
router.get('/:id', validateIdParam('id'), memberController.getMemberById);

// Staff-only routes - require authentication and staff role
router.use(requireStaff);

// Get all members
router.get('/', memberController.getAllMembers);

// Search members
router.get('/search/:query', memberController.searchMembers);

// Add new member
router.post('/', 
  validateRequiredFields(['firstName', 'lastName', 'email', 'phone']),
  validateEmail('email'),
  memberController.addMember
);

// Update member
router.put('/:id', 
  validateIdParam('id'),
  validateEmail('email'),
  memberController.updateMember
);

// Delete member
router.delete('/:id', 
  validateIdParam('id'),
  memberController.deleteMember
);

module.exports = router;