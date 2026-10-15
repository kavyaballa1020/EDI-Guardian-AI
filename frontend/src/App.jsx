import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileClock,
  FileSearch,
  Files,
  LayoutDashboard,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";

import ValidateEdi from "./components/ValidateEdi";
import { getDashboard, getHistory, getReport } from "./services/api";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Validate EDI", icon: FileSearch, group: "WORKSPACE" },
  { label: "Validation History", icon: FileClock, group: "WORKSPACE" },
  { label: "Chat with EDI", icon: Bot, group: "INTELLIGENCE" },
  { label: "Supplier Intelligence", icon: Truck, group: "INTELLIGENCE" },
];

const pageDescriptions = {
  Dashboard: "Your EDI compliance overview, all in one place.",
  "Validate EDI": "Validate documents and understand compliance issues.",
  "Validation History": "Review previous submissions and validation reports.",
  "Chat with EDI": "Ask questions about EDI documents and validation results.",
  "Supplier Intelligence":
    "Explore supplier performance and recurring compliance risks.",
};

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <ShieldCheck size={25} />
      </div>
      <div className="brand-copy">
        <div className="brand-title">EDI Guardian</div>
        <div className="brand-subtitle">EDI COMPLIANCE PLATFORM</div>
      </div>
    </div>
  );
}

function Sidebar({ activePage, onNavigate, open }) {
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Brand />

        {["WORKSPACE", "INTELLIGENCE"].map((group) => (
          <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            <nav className="nav-list" aria-label={group.toLowerCase()}>
              {navigation
                .filter((item) => item.group === group)
                .map(({ label, icon: Icon }) => (
                  <button
                    type="button"
                    key={label}
                    className={`nav-item ${
                      activePage === label ? "active" : ""
                    }`}
                    onClick={() => onNavigate(label)}
                    aria-current={
                      activePage === label ? "page" : undefined
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {activePage === label && (
                      <ChevronRight className="nav-chevron" size={15} />
                    )}
                  </button>
                ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-spacer" />

        <div className="sidebar-assistant">
          <div className="assistant-icon">
            <Sparkles size={17} />
          </div>
          <div className="assistant-copy">
            <strong>Rule-based validation</strong>
            <span>Persistent compliance reports</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <span className="connection-dot" />
          <span>Development environment</span>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="sidebar-overlay visible"
          aria-label="Close navigation"
          onClick={() => onNavigate(activePage)}
        />
      )}
    </>
  );
}

function Topbar({ activePage, onMenuToggle }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu"
          aria-label="Toggle navigation"
          onClick={onMenuToggle}
        >
          <Menu size={20} />
        </button>

        <div className="breadcrumb">
          <span>EDI Guardian</span>
          <ChevronRight size={14} />
          <strong>{activePage}</strong>
        </div>
      </div>

      <div className="topbar-right">
        <span className="environment-tag">
          <span className="environment-dot" />
          DEVELOPMENT
        </span>
        <div className="profile-avatar" title="Development user">
          EG
        </div>
      </div>
    </header>
  );
}

function PageHeading({ title, description, action }) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          EDI OPERATIONS
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, note }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${color}`}>
          <Icon size={19} />
        </div>
        <span className="metric-live-label">
          <span className="metric-live-dot" /> Live data
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}

function LoadingOrError({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="workspace-placeholder">
        <RefreshCw className="spin" />
        <p>Loading data from the backend…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-placeholder">
        <AlertTriangle size={28} />
        <h2>Could not load data</h2>
        <p>{error}</p>
        <button
          className="secondary-button"
          type="button"
          onClick={onRetry}
        >
          Try again <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  return null;
}

function StatusBadge({ status }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();
  const passed = ["PASSED", "VALID", "SUCCESS"].includes(normalized);

  return (
    <span className={`status-badge ${passed ? "passed" : "failed"}`}>
      {normalized}
    </span>
  );
}

function EmptyState({ icon: Icon = Files, title, description, action }) {
  return (
    <div className="content-placeholder">
      <Icon size={30} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

function RecentTable({ reports, onOpenHistory, onOpenReport, onNavigate }) {
  return (
    <section className="panel-card recent-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent validations</h2>
          <p>Your latest EDI document activity</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={onOpenHistory}
        >
          View all <ArrowRight size={14} />
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Supplier</th>
              <th>Score</th>
              <th>Status</th>
              <th>Report</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table">
                  <div className="table-empty-content">
                    <FileCheck2 size={23} />
                    <strong>No validation records yet</strong>
                    <span>
                      Submit an EDI document to build your compliance history.
                    </span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onNavigate("Validate EDI")}
                    >
                      Start validating <ArrowRight size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.validationId}>
                  <td>{report.fileName}</td>
                  <td>{report.transactionType || "—"}</td>
                  <td>{report.supplierId || "—"}</td>
                  <td>{report.complianceScore ?? "—"}</td>
                  <td>
                    <StatusBadge status={report.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onOpenReport(report.validationId)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dashboard({ onNavigate, onOpenReport }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await getDashboard());
    } catch (err) {
      setError(err.message || "Dashboard request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = data || {};

  const metrics = [
    {
      label: "Documents processed",
      value: stats.totalDocuments ?? 0,
      icon: Files,
      color: "blue",
      note: "All recorded validations",
    },
    {
      label: "Average compliance",
      value: `${stats.averageComplianceScore ?? 0}%`,
      icon: Activity,
      color: "teal",
      note: "Average rule-based score",
    },
    {
      label: "Passed documents",
      value: stats.validDocuments ?? 0,
      icon: CheckCircle2,
      color: "green",
      note: "Passed implemented checks",
    },
    {
      label: "Failed documents",
      value: stats.invalidDocuments ?? 0,
      icon: AlertTriangle,
      color: "amber",
      note: "Require review",
    },
  ];

  const transactionTypes = stats.byTransactionType || [];
  const maxCount = Math.max(
    1,
    ...transactionTypes.map((item) => Number(item.count) || 0)
  );

  return (
    <>
      <PageHeading
        title="Compliance overview"
        description="Monitor document quality, validation outcomes, and business risk."
        action={
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate("Validate EDI")}
          >
            <Upload size={16} /> New validation <ArrowRight size={15} />
          </button>
        }
      />

      {error || loading ? (
        <LoadingOrError
          loading={loading}
          error={error}
          onRetry={loadDashboard}
        />
      ) : (
        <>
          <section className="welcome-banner">
            <div className="welcome-decoration decoration-one" />
            <div className="welcome-decoration decoration-two" />

            <div className="welcome-content">
              <div className="welcome-kicker">
                <Sparkles size={15} /> EDI OPERATIONS
              </div>
              <h2>Confidence in every document.</h2>
              <p>
                Review validation outcomes and compliance trends in one
                workspace.
              </p>
              <button
                type="button"
                className="welcome-button"
                onClick={() => onNavigate("Validate EDI")}
              >
                Validate a document <ArrowRight size={15} />
              </button>
            </div>

            <div className="welcome-emblem" aria-hidden="true">
              <ShieldCheck size={68} strokeWidth={1.2} />
            </div>
          </section>

          <div className="section-heading">
            <div>
              <h2>Performance at a glance</h2>
              <p>Calculated from saved SQLite reports.</p>
            </div>
            <span className="period-label">
              <Clock3 size={14} /> All time
            </span>
          </div>

          <div className="stats-grid">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="panel-card">
              <div className="panel-heading">
                <div>
                  <h2>Transaction types</h2>
                  <p>Saved documents by X12 type</p>
                </div>
                <div className="panel-heading-icon">
                  <BarChart3 size={18} />
                </div>
              </div>

              {transactionTypes.length ? (
                <div className="simple-bars">
                  {transactionTypes.map((item) => (
                    <div className="simple-bar-row" key={item.transactionType}>
                      <span>{item.transactionType}</span>
                      <div className="simple-bar-track">
                        <div
                          className="simple-bar-fill"
                          style={{
                            width: `${
                              Math.max(
                                4,
                                ((Number(item.count) || 0) / maxCount) * 100
                              )
                            }%`,
                          }}
                        />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-chart">No transaction data yet.</p>
              )}
            </section>

            <section className="panel-card">
              <div className="panel-heading">
                <div>
                  <h2>Supplier overview</h2>
                  <p>Validation volumes by supplier</p>
                </div>
                <div className="panel-heading-icon teal">
                  <Truck size={18} />
                </div>
              </div>

              {(stats.bySupplier || []).length ? (
                <div className="supplier-list">
                  {stats.bySupplier.map((item) => (
                    <div className="supplier-row" key={item.supplierId}>
                      <span>{item.supplierId}</span>
                      <span>
                        {item.count} documents · {item.failed} failed
                      </span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onNavigate("Supplier Intelligence")}
                  >
                    Explore supplier intelligence <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <p className="empty-chart">
                  Add a supplier ID during validation to see supplier metrics.
                </p>
              )}
            </section>
          </div>

          <RecentTable
            reports={stats.recentReports || []}
            onOpenHistory={() => onNavigate("Validation History")}
            onOpenReport={onOpenReport}
            onNavigate={onNavigate}
          />

          <div className="dashboard-footnote">
            <CircleHelp size={14} />
            Scores are based on implemented structural rules, not full
            trading-partner certification.
          </div>
        </>
      )}
    </>
  );
}

function ValidationHistory({ onOpenReport, onNavigate }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({
    data: [],
    pagination: { total: 0, hasMore: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getHistory({
        search,
        status,
        transactionType,
        supplierId,
        limit,
        offset: page * limit,
      });

      setResult({
        data: response.data || [],
        pagination: response.pagination || {
          total: (response.data || []).length,
          hasMore: false,
        },
      });
    } catch (err) {
      setError(err.message || "History request failed.");
    } finally {
      setLoading(false);
    }
  }, [search, status, transactionType, supplierId, page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function changeFilter(setter, value) {
    setter(value);
    setPage(0);
  }

  return (
    <>
      <PageHeading
        title="Validation history"
        description={pageDescriptions["Validation History"]}
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={loadHistory}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <section className="panel-card">
        <div className="history-filters">
          <label className="history-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => changeFilter(setSearch, e.target.value)}
              placeholder="Search file, supplier, or report ID"
            />
          </label>

          <select
            value={status}
            onChange={(e) => changeFilter(setStatus, e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="VALID">Valid</option>
            <option value="INVALID">Invalid</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={transactionType}
            onChange={(e) =>
              changeFilter(setTransactionType, e.target.value)
            }
            aria-label="Filter by transaction type"
          >
            <option value="">All transaction types</option>
            <option value="850">850 Purchase Order</option>
            <option value="810">810 Invoice</option>
            <option value="856">856 Ship Notice</option>
            <option value="855">855 Acknowledgment</option>
          </select>

          <input
            value={supplierId}
            onChange={(e) => changeFilter(setSupplierId, e.target.value)}
            placeholder="Supplier ID"
            aria-label="Filter by supplier ID"
          />
        </div>

        {loading ? (
          <div className="history-message">
            <RefreshCw size={18} className="spin" />
            Loading validation history…
          </div>
        ) : error ? (
          <div className="history-message error-text">
            <AlertTriangle size={18} /> {error}
            <button type="button" onClick={loadHistory}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-table">
                        <div className="table-empty-content">
                          <FileClock size={23} />
                          <strong>No matching reports</strong>
                          <span>
                            Try changing the filters or validate a new
                            document.
                          </span>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => onNavigate("Validate EDI")}
                          >
                            Validate EDI <ArrowRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    result.data.map((report) => (
                      <tr key={report.validationId}>
                        <td>{report.validationId}</td>
                        <td>{report.fileName}</td>
                        <td>{report.transactionType || "—"}</td>
                        <td>{report.supplierId || "—"}</td>
                        <td>
                          {report.timestamp
                            ? new Date(report.timestamp).toLocaleString()
                            : "—"}
                        </td>
                        <td>{report.complianceScore ?? "—"}</td>
                        <td>
                          <StatusBadge status={report.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              onOpenReport(report.validationId)
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="history-pagination">
              <span>{result.pagination.total || 0} report(s)</span>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page === 0}
                  onClick={() =>
                    setPage((current) => Math.max(0, current - 1))
                  }
                >
                  Previous
                </button>
                <span> Page {page + 1} </span>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!result.pagination.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function ReportDetails({ report, onBack }) {
  const validation = report.deterministicValidation || {};
  const ai = report.aiAnalysis || {};
  const document = report.document || {};
  const compliance = report.compliance || {};

  const errors = validation.validationErrors || ai.errors || [];
  const warnings = validation.warnings || ai.warnings || [];
  const recommendations = ai.recommendations || [];

  return (
    <>
      <PageHeading
        title="Validation report"
        description={`Report ${report.validationId || ""}`}
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            <ArrowRight size={14} /> Back
          </button>
        }
      />

      <section className="panel-card report-detail">
        <div className="report-detail-heading">
          <div>
            <h2>{document.fileName || report.fileName || "EDI document"}</h2>
            <p>
              {report.timestamp
                ? new Date(report.timestamp).toLocaleString()
                : ""}
            </p>
          </div>
          <StatusBadge status={compliance.status || report.status} />
        </div>

        <div className="report-detail-grid">
          <div>
            <span>Transaction type</span>
            <strong>{document.transactionType || report.transactionType || "—"}</strong>
          </div>
          <div>
            <span>Supplier</span>
            <strong>{document.supplierId || report.supplierId || "—"}</strong>
          </div>
          <div>
            <span>Compliance score</span>
            <strong>
              {compliance.score ?? report.complianceScore ?? "—"}%
            </strong>
          </div>
          <div>
            <span>Segments detected</span>
            <strong>{validation.segmentCount ?? "—"}</strong>
          </div>
        </div>

        <section className="report-section">
          <h3><AlertTriangle size={17} /> Validation errors</h3>
          {errors.length ? (
            <ul>
              {errors.map((item, index) => (
                <li key={index}>
                  {typeof item === "string"
                    ? item
                    : `${item.code ? `${item.code}: ` : ""}${
                        item.message || JSON.stringify(item)
                      }`}
                </li>
              ))}
            </ul>
          ) : (
            <p>No validation errors were reported by the implemented checks.</p>
          )}
        </section>

        <section className="report-section">
          <h3><CircleHelp size={17} /> Warnings</h3>
          {warnings.length ? (
            <ul>
              {warnings.map((item, index) => (
                <li key={index}>
                  {typeof item === "string"
                    ? item
                    : item.message || JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No warnings.</p>
          )}
        </section>

        <section className="report-section">
          <h3><CheckCircle2 size={17} /> Recommendations</h3>
          {recommendations.length ? (
            <ul>
              {recommendations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No additional recommendations available.</p>
          )}
        </section>

        <p className="dashboard-footnote">
          This report uses local deterministic validation rules. It is not
          AI-generated certification.
        </p>
      </section>
    </>
  );
}

/* ---------------- CHAT WITH EDI ---------------- */

const chatSuggestions = [
  "What is an EDI 850 document?",
  "Explain EDI validation errors",
  "How many documents have failed?",
  "How can I fix a missing SE segment?",
];

function explainEdiQuestion(question, dashboard, reports) {
  const q = question.toLowerCase();
  const stats = dashboard || {};

  if (/\b(850|purchase order)\b/.test(q)) {
    return (
      "EDI 850 is the X12 Purchase Order transaction set. It communicates a buyer's " +
      "order to a supplier. In this project, the validator checks the transaction " +
      "envelope and the required BEG segment for an 850 document."
    );
  }

  if (/\b(810|invoice)\b/.test(q)) {
    return (
      "EDI 810 is the X12 Invoice transaction set. It communicates billing " +
      "information from a supplier to a buyer. This project's current structural " +
      "checks include the required BIG segment and the transaction envelope."
    );
  }

  if (/\b(856|ship notice|shipment)\b/.test(q)) {
    return (
      "EDI 856 is the X12 Ship Notice/Manifest transaction set. It provides " +
      "shipment details. The current validator checks for the BSN segment and " +
      "required envelope segments."
    );
  }

  if (/\b(855|acknowledg|order confirmation)\b/.test(q)) {
    return (
      "EDI 855 is the X12 Purchase Order Acknowledgment transaction set. It " +
      "communicates whether an order is accepted, rejected, or changed. The " +
      "current validator checks for the BAK segment and required envelope segments."
    );
  }

  if (/\b(missing se|se segment|segment count)\b/.test(q)) {
    return (
      "The SE segment ends an X12 transaction set. SE01 should match the number " +
      "of segments counted from ST through SE, including both ST and SE. " +
      "Check the SE count and ensure that the SE02 control number matches ST02. " +
      "The exact correction depends on the document you submitted."
    );
  }

  if (/\b(isa|iea|interchange)\b/.test(q)) {
    return (
      "ISA and IEA form the outer X12 interchange envelope. Their control numbers " +
      "must match. ISA also contains fixed-width fields, so incorrect spacing or " +
      "field positions can affect delimiter detection. Check the interchange " +
      "header, trailer, and control number."
    );
  }

  if (/\b(gs|ge|functional group)\b/.test(q)) {
    return (
      "GS and GE delimit an X12 functional group. Check that the GS and GE " +
      "control numbers match and that GE01 reflects the number of transaction " +
      "sets in the group."
    );
  }

  if (/\b(how many|total|processed|documents)\b/.test(q) &&
      /\b(fail|invalid|error|reject)\b/.test(q)) {
    return (
      `The saved reports currently contain ${stats.invalidDocuments ?? 0} invalid ` +
      `document(s) out of ${stats.totalDocuments ?? 0} total validation(s). ` +
      "These numbers come from the dashboard's SQLite data."
    );
  }

  if (/\b(pass|valid|successful)\b/.test(q) &&
      /\b(how many|total|documents|count)\b/.test(q)) {
    return (
      `The dashboard currently records ${stats.validDocuments ?? 0} valid ` +
      `document(s) out of ${stats.totalDocuments ?? 0} total validation(s).`
    );
  }

  if (/\b(score|compliance|pass rate)\b/.test(q)) {
    return (
      `The current average compliance score is ${stats.averageComplianceScore ?? 0}%. ` +
      "The score is a heuristic based on the implemented validation rules; it is " +
      "not an official trading-partner certification or a complete EDI compliance audit."
    );
  }

  if (/\b(supplier|vendor)\b/.test(q)) {
    const supplierRows = stats.bySupplier || [];

    if (supplierRows.length) {
      return (
        "Supplier summary from saved reports:\n" +
        supplierRows
          .map(
            (item) =>
              `${item.supplierId}: ${item.count} document(s), ${item.failed} failed.`
          )
          .join("\n")
      );
    }

    return (
      "There are no supplier statistics yet. Enter a supplier ID when validating " +
      "documents, then submit reports to build supplier history."
    );
  }

  if (/\b(latest|recent|last)\b/.test(q) &&
      /\b(report|document|validation|failure|failed|invalid)\b/.test(q)) {
    if (!reports.length) {
      return "No saved validation reports were found. Validate a document first.";
    }

    const latest = reports[0];
    return (
      `The latest report returned is ${latest.fileName || "an EDI document"}. ` +
      `Transaction type: ${latest.transactionType || "unknown"}. ` +
      `Supplier: ${latest.supplierId || "not provided"}. ` +
      `Status: ${latest.status || "unknown"}. ` +
      `Score: ${latest.complianceScore ?? "not available"}. ` +
      "Open Validation History to inspect its detailed findings."
    );
  }

  if (/\b(what is edi|define edi|edi mean|electronic data interchange)\b/.test(q)) {
    return (
      "EDI stands for Electronic Data Interchange. It allows businesses to exchange " +
      "structured documents, such as purchase orders, invoices, and shipping notices, " +
      "between computer systems using agreed formats."
    );
  }

  if (/\b(hello|hi|hey)\b/.test(q)) {
    return (
      "Hello! I can explain common X12 transaction types, describe the validation " +
      "rules implemented in EDI Guardian, and summarize saved validation statistics. " +
      "Try one of the suggested questions below."
    );
  }

  return (
    "I can currently answer questions about EDI 850, 810, 856, and 855 documents; " +
    "ISA, GS, ST, SE, GE, and IEA segments; validation troubleshooting; and the " +
    "statistics available in saved reports. Try asking a more specific question. " +
    "This assistant uses predefined rules and saved report data, not a generative AI model."
  );
}

function ChatWithEdi() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text:
        "Welcome to Chat with EDI. I can explain X12 document types, help you " +
        "understand common validation errors, and summarize your saved reports. " +
        "What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (question) => {
    const text = question.trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text },
    ]);
    setSending(true);

    try {
      const [dashboardResult, historyResult] = await Promise.all([
        getDashboard(),
        getHistory({ limit: 50, offset: 0 }),
      ]);

      const reports = historyResult.data || [];
      const answer = explainEdiQuestion(text, dashboardResult, reports);

      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: answer },
      ]);
    } catch (err) {
      setError(
        "I could not retrieve the latest report data. Check that the backend is running and try again."
      );
    } finally {
      setSending(false);
    }
  };

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      <PageHeading
        title="Chat with EDI"
        description={pageDescriptions["Chat with EDI"]}
      />

      <section className="panel-card chat-panel">
        <div className="chat-header">
          <div className="chat-header-icon">
            <Bot size={22} />
          </div>
          <div>
            <h2>EDI Guardian Assistant</h2>
            <p>
              <span className="connection-dot" /> Rule-based assistant · Report-aware
            </p>
          </div>
        </div>

        <div className="chat-messages" aria-live="polite">
          {messages.map((message) => (
            <div
              className={`chat-message ${message.role}`}
              key={message.id}
            >
              <div className="chat-message-avatar">
                {message.role === "assistant" ? (
                  <Bot size={17} />
                ) : (
                  <User size={17} />
                )}
              </div>
              <div className="chat-message-body">
                <span className="chat-message-author">
                  {message.role === "assistant" ? "EDI Guardian" : "You"}
                </span>
                <p>{message.text}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="chat-message assistant">
              <div className="chat-message-avatar">
                <Bot size={17} />
              </div>
              <div className="chat-message-body">
                <span className="chat-message-author">EDI Guardian</span>
                <p><RefreshCw size={14} className="spin" /> Checking saved reports…</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="feedback-box feedback-error" role="alert">
            <AlertTriangle size={17} />
            <p>{error}</p>
          </div>
        )}

        <div className="chat-suggestions">
          <span>Try asking</span>
          <div>
            {chatSuggestions.map((suggestion) => (
              <button
                type="button"
                className="chat-suggestion"
                key={suggestion}
                disabled={sending}
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question about EDI…"
            aria-label="Ask a question about EDI"
            maxLength={500}
            disabled={sending}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={!input.trim() || sending}
          >
            <Send size={16} /> Send
          </button>
        </form>

        <p className="chat-disclaimer">
          Answers use predefined rules and saved SQLite reports. This is not a
          generative AI assistant, and it may not answer questions outside its
          supported topics.
        </p>
      </section>
    </>
  );
}

/* ---------------- SUPPLIER INTELLIGENCE ---------------- */

function SupplierIntelligence({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setDashboard(await getDashboard());
    } catch (err) {
      setError(err.message || "Could not load supplier statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const suppliers = (dashboard?.bySupplier || []).filter((supplier) =>
    String(supplier.supplierId || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalSuppliers = (dashboard?.bySupplier || []).length;
  const totalDocuments = (dashboard?.bySupplier || []).reduce(
    (sum, supplier) => sum + (Number(supplier.count) || 0),
    0
  );
  const totalFailed = (dashboard?.bySupplier || []).reduce(
    (sum, supplier) => sum + (Number(supplier.failed) || 0),
    0
  );
  const failureRate = totalDocuments
    ? Math.round((totalFailed / totalDocuments) * 100)
    : 0;

  return (
    <>
      <PageHeading
        title="Supplier intelligence"
        description={pageDescriptions["Supplier Intelligence"]}
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={loadSuppliers}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {loading || error ? (
        <LoadingOrError
          loading={loading}
          error={error}
          onRetry={loadSuppliers}
        />
      ) : (
        <>
          <section className="welcome-banner supplier-welcome">
            <div className="welcome-decoration decoration-one" />
            <div className="welcome-content">
              <div className="welcome-kicker">
                <Truck size={15} /> SUPPLIER QUALITY
              </div>
              <h2>Know where your EDI risks begin.</h2>
              <p>
                Review supplier document volumes and identify suppliers whose
                submitted documents need additional attention.
              </p>
              <button
                type="button"
                className="welcome-button"
                onClick={() => onNavigate("Validation History")}
              >
                Review reports <ArrowRight size={15} />
              </button>
            </div>
            <div className="welcome-emblem" aria-hidden="true">
              <BarChart3 size={65} strokeWidth={1.3} />
            </div>
          </section>

          <div className="section-heading">
            <div>
              <h2>Supplier performance</h2>
              <p>Calculated from saved validation reports.</p>
            </div>
          </div>

          <div className="stats-grid">
            <MetricCard
              label="Suppliers recorded"
              value={totalSuppliers}
              icon={Truck}
              color="blue"
              note="Distinct supplier IDs in saved reports"
            />
            <MetricCard
              label="Supplier documents"
              value={totalDocuments}
              icon={Files}
              color="teal"
              note="Documents associated with known suppliers"
            />
            <MetricCard
              label="Failed documents"
              value={totalFailed}
              icon={AlertTriangle}
              color="amber"
              note="Failed reports across recorded suppliers"
            />
            <MetricCard
              label="Overall failure rate"
              value={`${failureRate}%`}
              icon={Activity}
              color="green"
              note="Failed documents divided by supplier documents"
            />
          </div>

          <section className="panel-card supplier-intelligence-panel">
            <div className="panel-heading">
              <div>
                <h2>Supplier performance breakdown</h2>
                <p>
                  Search suppliers and review their validation outcomes.
                </p>
              </div>
              <div className="panel-heading-icon teal">
                <BarChart3 size={18} />
              </div>
            </div>

            <label className="history-search supplier-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search supplier ID"
                aria-label="Search supplier ID"
              />
            </label>

            {suppliers.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier ID</th>
                      <th>Documents</th>
                      <th>Failed</th>
                      <th>Successful / Other</th>
                      <th>Failure rate</th>
                      <th>Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => {
                      const count = Number(supplier.count) || 0;
                      const failed = Number(supplier.failed) || 0;
                      const nonFailed = Math.max(0, count - failed);
                      const rate = count
                        ? Math.round((failed / count) * 100)
                        : 0;

                      return (
                        <tr key={supplier.supplierId}>
                          <td><strong>{supplier.supplierId}</strong></td>
                          <td>{count}</td>
                          <td>{failed}</td>
                          <td>{nonFailed}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                rate > 0 ? "warning" : "passed"
                              }`}
                            >
                              {rate}%
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => onNavigate("Validation History")}
                            >
                              View history <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Truck}
                title={
                  search
                    ? "No matching suppliers"
                    : "No supplier data yet"
                }
                description={
                  search
                    ? "Try another supplier ID."
                    : "Validate documents with a supplier ID to populate this page. Supplier metrics are calculated from saved reports."
                }
                action={
                  !search ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => onNavigate("Validate EDI")}
                    >
                      <Upload size={15} /> Validate a document
                    </button>
                  ) : null
                }
              />
            )}
          </section>

          <div className="dashboard-footnote">
            <CircleHelp size={14} />
            These are historical document statistics, not a complete supplier
            risk assessment. The successful / other column means total
            documents minus failed documents; it is not an independent quality
            certification.
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- MAIN APPLICATION ---------------- */

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previousPage, setPreviousPage] = useState("Validation History");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
    setSelectedReport(null);
    setReportError("");
  };

  const openReport = async (validationId) => {
    setPreviousPage(activePage === "Dashboard" ? "Dashboard" : "Validation History");
    setSelectedReport(null);
    setReportError("");
    setReportLoading(true);
    setActivePage("Validation Report");
    setSidebarOpen(false);

    try {
      const result = await getReport(validationId);
      setSelectedReport(result);
    } catch (err) {
      setReportError(err.message || "Could not load the report.");
    } finally {
      setReportLoading(false);
    }
  };

  const goBackFromReport = () => {
    setSelectedReport(null);
    setReportError("");
    setActivePage(previousPage);
  };

  let pageContent;

  switch (activePage) {
    case "Dashboard":
      pageContent = (
        <Dashboard onNavigate={navigate} onOpenReport={openReport} />
      );
      break;

    case "Validate EDI":
      pageContent = <ValidateEdi />;
      break;

    case "Validation History":
      pageContent = (
        <ValidationHistory
          onOpenReport={openReport}
          onNavigate={navigate}
        />
      );
      break;

    case "Validation Report":
      pageContent = reportLoading ? (
        <LoadingOrError loading />
      ) : reportError ? (
        <LoadingOrError
          loading={false}
          error={reportError}
          onRetry={() => selectedReport && openReport(selectedReport.validationId)}
        />
      ) : selectedReport ? (
        <ReportDetails report={selectedReport} onBack={goBackFromReport} />
      ) : (
        <EmptyState
          title="Report unavailable"
          description="Return to the validation history and select a report."
          action={
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate(previousPage)}
            >
              Go back
            </button>
          }
        />
      );
      break;

    case "Chat with EDI":
      pageContent = <ChatWithEdi />;
      break;

    case "Supplier Intelligence":
      pageContent = <SupplierIntelligence onNavigate={navigate} />;
      break;

    default:
      pageContent = (
        <EmptyState
          title="Page not found"
          description="Choose a page from the navigation menu."
          action={
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("Dashboard")}
            >
              Return to dashboard
            </button>
          }
        />
      );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        open={sidebarOpen}
      />

      <div className="main-area">
        <Topbar
          activePage={activePage}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
        />

        <main className="page-content" key={activePage}>
          {pageContent}
        </main>

        <footer className="app-footer">
          <span>EDI Guardian</span>
          <span className="footer-separator">·</span>
          <span>Rule-based EDI compliance monitoring</span>
        </footer>
      </div>
    </div>
  );
}
