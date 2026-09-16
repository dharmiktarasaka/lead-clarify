const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  analyzeSingleLead,
  analyzeBatchLeads
} = require("../controllers/aiController");

const router = express.Router();

router.use(protect);

router.post("/analyze-lead/:id", analyzeSingleLead);
router.post("/analyze-batch", analyzeBatchLeads);

module.exports = router;
