const express = require('express');
const { addContractor, getContractors, deleteContractor, updateContractor, getContractorById } = require('../controllers/contractorController');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../errors');
const router = express.Router();

router.use(asyncHandler(protect));
router.route('/').get(asyncHandler(getContractors)).post(asyncHandler(addContractor));
router.route('/:id').get(asyncHandler(getContractorById)).put(asyncHandler(updateContractor)).delete(asyncHandler(deleteContractor));

module.exports = router;
