"use strict";
 
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();
 
const { validateEdi, buildRecommendations } = require("./ediValidator");
const {
  saveReport,
  getReport,
  listReports,
  getDashboardStats,
} = require("./database");
 
const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MAX_EDI_BYTES = 1024 * 1024;
 
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
 
app.use(express.json({ limit: "2mb" }));
 
function createValidationReport(input) {
  const {
    fileName = "uploaded-document.edi",
    documentType = "X12",
    transactionType,
    supplierId,
    ediContent,
  } = input;
 
  const deterministicValidation = validateEdi({
    fileName,
    documentType,
    transactionType,
    supplierId,
    ediContent,
  });
 
  const recommendations = buildRecommendations(deterministicValidation);
  const passed = deterministicValidation.structurallyValid;
 
  return {
    validationId: `VAL-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`,
    timestamp: new Date().toISOString(),
 
    document: {
      fileName,
      standard: documentType,
      transactionType:
        deterministicValidation.transactionType || transactionType || null,
      supplierId: supplierId || null,
    },
 
    compliance: {
      score: deterministicValidation.complianceScore,
      status: passed ? "PASSED" : "FAILED",
    },
 
    deterministicValidation,
 
    // Rule-based findings, not AI-generated analysis.
    aiAnalysis: {
      provider: "rule-based",
      isAiGenerated: false,
      summary: passed
        ? "The document passed the implemented structural validation rules."
        : `Validation found ${deterministicValidation.validationErrors.length} error(s). Review the findings before processing.`,
      errors: deterministicValidation.validationErrors,
      warnings: deterministicValidation.warnings,
      risks: passed
        ? [
            "No errors were found by the implemented checks. Additional trading-partner or business-rule risks may still exist.",
          ]
        : [
            "The document failed one or more validation checks and should be corrected before downstream processing.",
          ],
      recommendations,
    },
 
    processingStage: "COMPLETED",
    analysisMode: "DETERMINISTIC_RULES",
  };
}
 
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "EDI Guardian AI API is running.",
    timestamp: new Date().toISOString(),
    services: {
      api: "running",
      validationProvider: "local-rules",
      geminiRequired: false,
      cpiRequired: false,
      database: "sqlite",
    },
  });
});
 
app.post("/api/validate", (req, res) => {
  try {
    const {
      fileName,
      documentType = "X12",
      transactionType,
      supplierId,
      ediContent,
    } = req.body || {};
 
    if (typeof ediContent !== "string" || !ediContent.trim()) {
      return res.status(400).json({
        success: false,
        message: "EDI content is required.",
      });
    }
 
    if (Buffer.byteLength(ediContent, "utf8") > MAX_EDI_BYTES) {
      return res.status(413).json({
        success: false,
        message: "The EDI document exceeds the 1 MB limit.",
      });
    }
 
    if (typeof documentType !== "string") {
      return res.status(400).json({
        success: false,
        message: "Document type must be a string.",
      });
    }
 
    if (
      transactionType !== undefined &&
      typeof transactionType !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be a string.",
      });
    }
 
    if (supplierId !== undefined && typeof supplierId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Supplier ID must be a string.",
      });
    }
 
    const safeFileName =
      typeof fileName === "string" && fileName.trim()
        ? fileName.trim().split(/[\\/]/).pop().slice(0, 255)
        : "uploaded-document.edi";
 
    const safeSupplierId =
      typeof supplierId === "string" && supplierId.trim()
        ? supplierId.trim().slice(0, 100)
        : null;
 
    const report = createValidationReport({
      fileName: safeFileName,
      documentType: documentType.trim().toUpperCase(),
      transactionType: transactionType
        ? transactionType.trim().replace(/^X12[_-]?/i, "")
        : undefined,
      supplierId: safeSupplierId,
      ediContent,
    });
 
    // Persist the report before confirming success to the frontend.
    saveReport(report);
 
    return res.status(200).json({
      success: true,
      ...report,
      report,
    });
  } catch (error) {
    console.error("EDI validation failed:", error.message);
 
    return res.status(500).json({
      success: false,
      message: "The EDI validation request could not be processed.",
    });
  }
});
 
// Dashboard summary and aggregated metrics.
app.get("/api/dashboard", (req, res) => {
  try {
    return res.json({
      success: true,
      data: getDashboardStats(),
    });
  } catch (error) {
    console.error("Dashboard query failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load dashboard statistics.",
    });
  }
});
 
// Searchable and filterable validation history.
app.get("/api/history", (req, res) => {
  try {
    const search = String(req.query.search || "").trim().slice(0, 100);
    const status = String(req.query.status || "").trim().toUpperCase();
    const supplierId = String(req.query.supplierId || "").trim().slice(0, 100);
    const transactionType = String(req.query.transactionType || "")
      .trim()
      .replace(/^X12[_-]?/i, "");
 
    if (status && !["PASSED", "FAILED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be PASSED or FAILED.",
      });
    }
 
    if (
      transactionType &&
      !["850", "810", "856", "855"].includes(transactionType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Unsupported transaction type filter.",
      });
    }
 
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );
 
    const offset = Math.max(
      0,
      Number.parseInt(req.query.offset, 10) || 0
    );
 
    const result = listReports({
      search,
      status,
      supplierId,
      transactionType,
      limit,
      offset,
    });
 
    return res.json({
      success: true,
      data: result.reports,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.reports.length < result.total,
      },
    });
  } catch (error) {
    console.error("History query failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load validation history.",
    });
  }
});
 
// Retrieve a single previously saved report.
app.get("/api/history/:validationId", (req, res) => {
  try {
    const report = getReport(req.params.validationId);
 
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Validation report not found.",
      });
    }
 
    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Report retrieval failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve the validation report.",
    });
  }
});
 
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "The requested API endpoint was not found.",
  });
});
 
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
 
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "The request body is too large.",
    });
  }
 
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      success: false,
      message: "The request body contains invalid JSON.",
    });
  }
 
  console.error("API error:", error.message);
 
  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});
 
app.listen(PORT, () => {
  console.log(`EDI Guardian AI API running on port ${PORT}`);
  console.log("Validation provider: local deterministic rules");
  console.log("Database: SQLite");
  console.log("Gemini dependency: disabled");
  console.log("SAP CPI dependency: disabled");
});