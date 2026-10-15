import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  FileCheck2,
} from "lucide-react";
import { validateEdi } from "../services/api";
 
const MAX_FILE_SIZE = 1024 * 1024;
 
const SAMPLE_EDI = `ISA*00*          *00*          *ZZ*SENDER001     *ZZ*RECEIVER001   *260101*1200*U*00401*000000001*0*T*:~
GS*PO*SENDER001*RECEIVER001*20260101*1200*1*X*004010~
ST*850*0001~
BEG*00*SA*PO12345**20260101~
REF*IA*SUPPLIER001~
N1*ST*Example Warehouse~
PO1*1*10*EA*25.00**VN*ITEM001~
CTT*1~
SE*7*0001~
GE*1*1~
IEA*1*000000001~`;
 
const DOCUMENT_TYPES = [
  { value: "850", label: "X12 850 — Purchase Order" },
  { value: "810", label: "X12 810 — Invoice" },
  { value: "856", label: "X12 856 — Ship Notice" },
  { value: "855", label: "X12 855 — Purchase Order Acknowledgment" },
];
 
function displayFinding(item) {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    if (item.code && item.message) return `${item.code}: ${item.message}`;
    return item.message || JSON.stringify(item);
  }
  return String(item ?? "");
}
 
function FindingsList({ title, items = [], icon: Icon, emptyMessage }) {
  return (
    <div className="ai-finding">
      <h4><Icon size={17} /> {title}</h4>
      {items.length ? (
        <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{displayFinding(item)}</li>)}</ul>
      ) : <p>{emptyMessage}</p>}
    </div>
  );
}
 
export default function ValidateEdi({ onValidated }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [ediContent, setEdiContent] = useState("");
  const [documentType, setDocumentType] = useState("850");
  const [supplierId, setSupplierId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
 
  async function readFile(file) {
    setError("");
    setReport(null);
 
    if (!file) return;
 
    const extension = file.name.split(".").pop().toLowerCase();
 
    if (!["txt", "edi", "x12"].includes(extension)) {
      setError("Unsupported file type. Choose a .txt, .edi, or .x12 file.");
      return;
    }
 
    if (file.size > MAX_FILE_SIZE) {
      setError("The file exceeds the 1 MB upload limit.");
      return;
    }
 
    try {
      const content = await file.text();
 
      if (!content.trim()) {
        setError("The selected file is empty.");
        return;
      }
 
      setFileName(file.name);
      setEdiContent(content);
    } catch {
      setError("Could not read the selected file.");
    }
  }
 
  function loadSample() {
    setFileName("sample-purchase-order.x12");
    setEdiContent(SAMPLE_EDI);
    setDocumentType("850");
    setSupplierId("SUPPLIER001");
    setError("");
    setReport(null);
  }
 
  function resetForm() {
    setFileName("");
    setEdiContent("");
    setSupplierId("");
    setDocumentType("850");
    setError("");
    setReport(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
 
  async function handleValidate(event) {
    event.preventDefault();
    setError("");
    setReport(null);
 
    if (!ediContent.trim()) {
      setError("Upload an EDI file or load the sample document first.");
      return;
    }
 
    setLoading(true);
 
    try {
      const result = await validateEdi({
        fileName: fileName || "uploaded-document.edi",
        documentType: "X12",
        transactionType: documentType,
        supplierId: supplierId.trim(),
        ediContent,
      });
 
      setReport(result);
      onValidated?.(result);
    } catch (err) {
      setError(err.message || "Validation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }
 
  const validation = report?.deterministicValidation || {};
  const ai = report?.aiAnalysis || {};
  const errors = validation.validationErrors || ai.errors || [];
  const warnings = validation.warnings || ai.warnings || [];
  const recommendations = ai.recommendations || [];
  const passed =
    report?.compliance?.status === "PASSED" ||
    validation.status === "VALID";
 
  return (
    <>
      <div className="page-heading">
        <div className="page-heading-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> EDI OPERATIONS</div>
          <h1>Validate EDI</h1>
          <p>Check X12 document structure, control numbers, and required segments.</p>
        </div>
      </div>
 
      <section className="panel-card">
        <div className="panel-heading">
          <div><h2><Upload size={18} /> Submit an EDI document</h2><p>Supported formats: .edi, .x12 and .txt. Maximum file size: 1 MB.</p></div>
        </div>
 
        <form onSubmit={handleValidate}>
          <div
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              readFile(event.dataTransfer.files?.[0]);
            }}
          >
            <div className="upload-icon"><FileText size={25} /></div>
            <strong>{fileName || "Drop your EDI document here"}</strong>
            <span>{fileName ? "File selected and ready for validation" : "Or browse your computer to select a document"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".edi,.x12,.txt"
              hidden
              onChange={(event) => readFile(event.target.files?.[0])}
            />
            <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} /> Browse files
            </button>
          </div>
 
          <div className="validation-form-grid">
            <label>
              <span>Transaction type</span>
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                {DOCUMENT_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label>
              <span>Supplier ID (optional)</span>
              <input value={supplierId} onChange={(event) => setSupplierId(event.target.value)} maxLength={100} placeholder="e.g. SUPPLIER001" />
            </label>
          </div>
 
          <label className="edi-content-label">
            <span>EDI content</span>
            <textarea
              value={ediContent}
              onChange={(event) => { setEdiContent(event.target.value); setFileName(""); setReport(null); }}
              rows={10}
              maxLength={1024 * 1024}
              placeholder="Upload a file or paste your X12 EDI content here…"
              spellCheck={false}
            />
          </label>
 
          {error && <div className="error-banner"><AlertCircle size={18} /><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
 
          <div className="validation-actions">
            <button type="button" className="secondary-button" onClick={loadSample}><FlaskConical size={16} /> Load sample EDI</button>
            <button type="button" className="secondary-button" onClick={resetForm}><RotateCcw size={15} /> Reset</button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
              {loading ? "Validating…" : "Validate document"}
            </button>
          </div>
        </form>
      </section>
 
      {report && (
        <section className="panel-card validation-report">
          <div className="panel-heading">
            <div>
              <h2><FileCheck2 size={19} /> EDI validation report</h2>
              <p>{report.document?.fileName || fileName} · {report.validationId}</p>
            </div>
            <span className={`status-badge ${passed ? "passed" : "failed"}`}>{report.compliance?.status || validation.status}</span>
          </div>
 
          <div className="report-detail-grid">
            <div><span>Transaction type</span><strong>{report.document?.transactionType || documentType}</strong></div>
            <div><span>Validation status</span><strong>{validation.status || (passed ? "VALID" : "INVALID")}</strong></div>
            <div><span>Segments detected</span><strong>{validation.segmentCount ?? "—"}</strong></div>
            <div><span>Compliance score</span><strong>{report.compliance?.score ?? validation.complianceScore ?? 0}%</strong></div>
          </div>
 
          <div className="report-section">
            <h3><ShieldCheck size={18} /> Deterministic validation</h3>
            <FindingsList
              title="Validation errors"
              items={errors}
              icon={AlertTriangle}
              emptyMessage="No validation errors were reported by the implemented rules."
            />
            <FindingsList
              title="Missing segments"
              items={(validation.missingSegments || []).map((segment) => `${segment} is missing`)}
              icon={AlertCircle}
              emptyMessage="No required envelope segments are missing."
            />
            <FindingsList
              title="Warnings"
              items={warnings}
              icon={AlertTriangle}
              emptyMessage="No warnings were reported."
            />
          </div>
 
          <div className="report-section">
            <h3><Sparkles size={18} /> Validation summary</h3>
            <p>{ai.summary || "The document was evaluated using deterministic validation rules."}</p>
            <FindingsList
              title="Recommendations"
              items={recommendations}
              icon={Lightbulb}
              emptyMessage="No additional recommendations."
            />
          </div>
 
          <div className="dashboard-footnote">
            <AlertCircle size={14} />
            This version uses local rule-based validation. It does not use Gemini AI or SAP CPI, and its score is not a certification of full X12 or trading-partner compliance.
          </div>
        </section>
      )}
    </>
  );
}