const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/login', userController.login); // no auth required — this IS what mints the session
router.get('/me', authenticate, userController.me);
router.get('/stats', userController.stats); // public aggregate stats, no identity needed
router.get('/usage', authenticate, userController.getUsage); // real server-tracked usage for the current user
router.post('/settings', authenticate, userController.updateSettings);
router.get('/referral', authenticate, userController.getReferralStats);

// Admin panel endpoints (guarded by requireAdmin: valid session + ADMIN_TELEGRAM_IDS)
router.get('/admin/overview', requireAdmin, userController.adminOverview);
router.post('/admin/premium', requireAdmin, userController.setPremium);
router.get('/admin/settings', requireAdmin, userController.getAdminSettings);
router.post('/admin/settings', requireAdmin, userController.updateAdminSettings);
router.get('/admin/channels', requireAdmin, userController.getAdminChannels);
router.post('/admin/channels', requireAdmin, userController.updateAdminChannels);
router.get('/admin/coupons', requireAdmin, userController.getAdminCoupons);
router.post('/admin/coupons', requireAdmin, userController.upsertAdminCoupon);
router.post('/admin/coupons/:code/toggle', requireAdmin, userController.toggleAdminCoupon);
router.delete('/admin/coupons/:code', requireAdmin, userController.deleteAdminCoupon);
router.post('/admin/payments/:paymentId/approve', requireAdmin, userController.approvePayment);
router.post('/admin/payments/:paymentId/reject', requireAdmin, userController.rejectPayment);
router.post('/admin/broadcast', requireAdmin, userController.broadcastMessage);
router.get('/admin/referrals', requireAdmin, userController.adminReferrals);

module.exports = router;
