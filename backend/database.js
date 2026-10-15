 
"use strict";
 
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
 
const dataDirectory = path.join(__dirname, "data");
fs.mkdirSync(dataDirectory, { recursive: true });
 
const databasePath = path.join(dataDirectory, "edi-guardian.db");
const db = new Database(databasePath);
 
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
 
db.exec(`
  CREATE TABLE IF NOT EXISTS validation_reports (
    validation_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    file_name TEXT NOT NULL,
    transaction_type TEXT,
    supplier_id TEXT,
    status TEXT NOT NULL,
    compliance_score INTEGER,
    report_json TEXT NOT NULL
  );
 
  CREATE INDEX IF NOT EXISTS idx_reports_timestamp
    ON validation_reports(timestamp);
 
  CREATE INDEX IF NOT EXISTS idx_reports_status
    ON validation_reports(status);
 
  CREATE INDEX IF NOT EXISTS idx_reports_supplier
    ON validation_reports(supplier_id);
 
  CREATE INDEX IF NOT EXISTS idx_reports_transaction_type
    ON validation_reports(transaction_type);
`);
 
const insertReportStatement = db.prepare(`
  INSERT INTO validation_reports (
    validation_id,
    timestamp,
    file_name,
    transaction_type,
    supplier_id,
    status,
    compliance_score,
    report_json
  ) VALUES (
    @validationId,
    @timestamp,
    @fileName,
    @transactionType,
    @supplierId,
    @status,
    @complianceScore,
    @reportJson
  )
`);
 
function saveReport(report) {
  insertReportStatement.run({
    validationId: report.validationId,
    timestamp: report.timestamp,
    fileName: report.document.fileName,
    transactionType: report.document.transactionType || null,
    supplierId: report.document.supplierId || null,
    status: report.compliance.status,
    complianceScore: report.compliance.score,
    reportJson: JSON.stringify(report),
  });
}
 
function getReport(validationId) {
  const row = db.prepare(`
    SELECT report_json
    FROM validation_reports
    WHERE validation_id = ?
  `).get(validationId);
 
  return row ? JSON.parse(row.report_json) : null;
}
 
function listReports({
  search = "",
  status = "",
  supplierId = "",
  transactionType = "",
  limit = 20,
  offset = 0,
} = {}) {
  const conditions = [];
  const params = {};
 
  if (search) {
    conditions.push(
      "(file_name LIKE @search OR supplier_id LIKE @search OR validation_id LIKE @search)"
    );
    params.search = `%${search}%`;
  }
 
  if (status) {
    conditions.push("status = @status");
    params.status = status;
  }
 
  if (supplierId) {
    conditions.push("supplier_id LIKE @supplierId");
    params.supplierId = `%${supplierId}%`;
  }
 
  if (transactionType) {
    conditions.push("transaction_type = @transactionType");
    params.transactionType = transactionType;
  }
 
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
 
  const countRow = db.prepare(`
    SELECT COUNT(*) AS total
    FROM validation_reports
    ${whereClause}
  `).get(params);
 
  const rows = db.prepare(`
    SELECT
      validation_id AS validationId,
      timestamp,
      file_name AS fileName,
      transaction_type AS transactionType,
      supplier_id AS supplierId,
      status,
      compliance_score AS complianceScore
    FROM validation_reports
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });
 
  return { total: countRow.total, reports: rows };
}
 
function getDashboardStats() {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) AS passed,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
      ROUND(AVG(compliance_score)) AS averageScore
    FROM validation_reports
  `).get();
 
  const recent = db.prepare(`
    SELECT
      validation_id AS validationId,
      timestamp,
      file_name AS fileName,
      transaction_type AS transactionType,
      supplier_id AS supplierId,
      status,
      compliance_score AS complianceScore
    FROM validation_reports
    ORDER BY timestamp DESC
    LIMIT 5
  `).all();
 
  const byTransactionType = db.prepare(`
    SELECT
      transaction_type AS transactionType,
      COUNT(*) AS count
    FROM validation_reports
    WHERE transaction_type IS NOT NULL
    GROUP BY transaction_type
    ORDER BY count DESC
  `).all();
 
  const bySupplier = db.prepare(`
    SELECT
      supplier_id AS supplierId,
      COUNT(*) AS count,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed
    FROM validation_reports
    WHERE supplier_id IS NOT NULL
    GROUP BY supplier_id
    ORDER BY count DESC
    LIMIT 10
  `).all();
 
  const total = totals.total || 0;
  const passed = totals.passed || 0;
 
  return {
    totalDocuments: total,
    validDocuments: passed,
    invalidDocuments: totals.failed || 0,
    passRate: total ? Math.round((passed / total) * 100) : 0,
    averageComplianceScore: totals.averageScore ?? 0,
    recentReports: recent,
    byTransactionType,
    bySupplier,
  };
}
 
module.exports = {
  db,
  saveReport,
  getReport,
  listReports,
  getDashboardStats,
};
 