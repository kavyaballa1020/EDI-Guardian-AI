const { GoogleGenAI } = require("@google/genai");
 
let aiClient;
 
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
 
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend/.env.");
  }
 
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
 
  return aiClient;
}
 
function normalizeList(value) {
  if (!Array.isArray(value)) return [];
 
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}
 
function parseAIResponse(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }
 
  // JSON mode should return JSON, but remove code fences defensively.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
 
  const parsed = JSON.parse(cleaned);
 
  return {
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary.slice(0, 1500)
        : "Analysis completed.",
 
    errors: normalizeList(parsed.errors),
    warnings: normalizeList(parsed.warnings),
    risks: normalizeList(parsed.risks),
    recommendations: normalizeList(parsed.recommendations),
  };
}
 
async function analyzeEdi(validationResult) {
  try {
    const ai = getAIClient();
 
    // Send only the validation summary, not the original EDI payload.
    const input = {
      fileName: validationResult.fileName,
      documentType: validationResult.documentType,
      transactionType: validationResult.transactionType,
      expectedTransactionType:
        validationResult.expectedTransactionType,
      structurallyValid: validationResult.structurallyValid,
      status: validationResult.status,
      segmentCount: validationResult.segmentCount,
      detectedSegments: validationResult.detectedSegments,
      missingSegments: validationResult.missingSegments,
      controlNumbers: validationResult.controlNumbers,
      validationErrors: validationResult.validationErrors,
      warnings: validationResult.warnings,
    };
 
    const prompt = `
You are an EDI X12 compliance analyst.
 
Analyze the following deterministic validation summary.
Do not claim to have inspected the original EDI document.
Do not invent missing facts or claim that a transaction is compliant
when the available information is insufficient.
 
Explain the findings in clear, business-friendly English.
Distinguish confirmed validation findings from potential risks.
Provide actionable recommendations.
 
Return ONLY a JSON object with this exact structure:
{
  "summary": "string",
  "errors": ["string"],
  "warnings": ["string"],
  "risks": ["string"],
  "recommendations": ["string"]
}
 
Rules:
- Preserve the meaning of the deterministic validation results.
- Do not contradict confirmed validation errors.
- If no errors are present, return an empty errors array.
- Mention uncertainty where relevant.
- Do not calculate a compliance score.
- Limit each array to 10 concise items.
 
Validation summary:
${JSON.stringify(input)}
`;
 
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
 
    const analysis = parseAIResponse(response.text);
 
    return {
      available: true,
      ...analysis,
      message: "AI analysis completed successfully.",
    };
  } catch (error) {
    // Log a brief message; never log the API key or request credentials.
    console.error("Gemini analysis failed:", error.message);
 
    return {
      available: false,
      summary: null,
      errors: [],
      warnings: [],
      risks: [],
      recommendations: [],
      message: "AI analysis is temporarily unavailable.",
    };
  }
}
 
module.exports = { analyzeEdi };