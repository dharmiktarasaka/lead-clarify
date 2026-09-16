require("dotenv").config();
const { enrichLeadWithWeb } = require("./services/leadEnrichmentService");

async function testFullPipeline() {
  const mockLead = {
    companyName: "IVORIES DENTAL",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    location: "Maulik Arcade, Judges Bunglow Rd, Mansi Tower, Ahmedabad, Gujarat"
  };

  console.log("Starting enrichment test for:", mockLead.companyName);
  const result = await enrichLeadWithWeb(mockLead);
  console.log("\nEnrichment Result:", JSON.stringify(result, null, 2));
}

testFullPipeline().catch(console.error);
