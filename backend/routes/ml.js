const router = require('express').Router();
const { analyzeLogs, retrainModel } = require('../controllers/mlDetection');
const { protect } = require('../middlewares');

router.get('/analyze', protect, analyzeLogs);
router.post('/retrain', protect, retrainModel);

module.exports = router;
