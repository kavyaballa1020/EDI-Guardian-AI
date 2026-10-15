 
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");
 
async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
 
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
 
    const data = await response.json().catch(() => null);
 
    if (!response.ok) {
      throw new Error(
        data?.message || `Request failed with status ${response.status}.`
      );
    }
 
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }
 
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to the backend. Make sure the backend server is running on port 5000."
      );
    }
 
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
 
export function getHealth() {
  return apiRequest("/health");
}
 
export async function validateEdi({
  fileName,
  documentType = "X12",
  transactionType,
  supplierId,
  ediContent,
}) {
  if (typeof ediContent !== "string" || !ediContent.trim()) {
    throw new Error("Please provide EDI document content.");
  }
 
  const payload = {
    fileName: fileName || "uploaded-document.edi",
    documentType,
    ediContent,
  };
 
  if (transactionType) payload.transactionType = transactionType;
  if (supplierId) payload.supplierId = supplierId;
 
  const response = await apiRequest("/validate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
 
  // The backend returns both top-level report fields and a report property.
  return response.report || response;
}
 
export async function getDashboard() {
  const response = await apiRequest("/dashboard");
  return response.data;
}
 
export async function getHistory({
  search = "",
  status = "",
  supplierId = "",
  transactionType = "",
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
 
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (supplierId) params.set("supplierId", supplierId);
  if (transactionType) params.set("transactionType", transactionType);
 
  params.set("limit", String(limit));
  params.set("offset", String(offset));
 
  return apiRequest(`/history?${params.toString()}`);
}
 
export async function getReport(validationId) {
  return apiRequest(`/history/${encodeURIComponent(validationId)}`);
}
 
const api = {
  getHealth,
  validateEdi,
  getDashboard,
  getHistory,
  getReport,
};
 
export default api;