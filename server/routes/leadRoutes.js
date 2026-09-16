const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  deleteBatchLeads,
  importCSV,
  enrichSingleLead,
  enrichBatchLeads,
  getScrapFolders,
  getScraps,
  recoverSingleScrap,
  recoverBatchScraps,
  deleteSingleScrap,
  deleteBatchScraps,
  verifySingleLead,
  bulkVerifyLeads,
  getLeadVerification,
  applyLeadEvidence
} = require("../controllers/leadController");

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/", createLead);
router.get("/", getLeads);
router.post("/import-csv", importCSV);
router.post("/delete-batch", deleteBatchLeads);
router.delete("/batch", deleteBatchLeads);
router.post("/enrich-batch", enrichBatchLeads);
router.post("/bulk-verify", bulkVerifyLeads);

// Scraps management & folder routes (must precede /:id)
router.get("/scraps/folders", getScrapFolders);
router.get("/scraps", getScraps);
router.post("/scraps/recover-batch", recoverBatchScraps);
router.post("/scraps/recover/:id", recoverSingleScrap);
router.delete("/scraps/batch", deleteBatchScraps);
router.delete("/scraps/:id", deleteSingleScrap);

// Lead verification endpoints
router.post("/:id/verify", verifySingleLead);
router.get("/:id/verification", getLeadVerification);
router.post("/:id/apply-evidence", applyLeadEvidence);

router.post("/:id/enrich", enrichSingleLead);
router.get("/:id", getLeadById);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

module.exports = router;
