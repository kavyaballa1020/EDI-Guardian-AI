 
"use strict";
 
const REQUIRED_TRANSACTION_SEGMENTS = {
  "850": ["BEG"],
  "810": ["BIG"],
  "856": ["BSN"],
  "855": ["BAK"],
};
 
function detectDelimiters(content) {
  const text = String(content || "");
 
  // X12 ISA has a fixed-width header when formatted correctly.
  if (text.startsWith("ISA") && text.length >= 106) {
    return {
      element: text[3],
      segment: text[105],
      component: text[104],
    };
  }
 
  // Fallback for incomplete or non-standard sample documents.
  const element = text.includes("*") ? "*" : "|";
  const segment = text.includes("~")
    ? "~"
    : text.includes("\n")
      ? "\n"
      : "~";
 
  return { element, segment, component: ":" };
}
 
function parseSegments(content, delimiters) {
  return String(content || "")
    .split(delimiters.segment)
    .map((segment) => segment.trim().replace(/\r/g, ""))
    .filter(Boolean)
    .map((raw) => {
      const elements = raw.split(delimiters.element);
      return {
        id: (elements[0] || "").trim().toUpperCase(),
        elements,
        raw,
      };
    });
}
 
function validateEdi({
  ediContent,
  fileName = "uploaded-document.edi",
  documentType = "X12",
  transactionType,
  supplierId,
} = {}) {
  const errors = [];
  const warnings = [];
 
  const content = typeof ediContent === "string" ? ediContent.trim() : "";
  const normalizedType = String(transactionType || "")
    .trim()
    .toUpperCase()
    .replace(/^X12[_-]?/, "");
 
  const expectedSegments = REQUIRED_TRANSACTION_SEGMENTS[normalizedType];
 
  if (!content) {
    return {
      fileName,
      documentType,
      transactionType: normalizedType || null,
      supplierId: supplierId || null,
      structurallyValid: false,
      status: "INVALID",
      segmentCount: 0,
      detectedSegments: [],
      missingSegments: ["ISA", "GS", "ST", "SE", "GE", "IEA"],
      controlNumbers: {},
      validationErrors: [
        { code: "EMPTY_DOCUMENT", message: "EDI content is empty." },
      ],
      warnings: [],
      complianceScore: 0,
      complianceScoreNote: "No document content was available to validate.",
    };
  }
 
  if (String(documentType).toUpperCase() !== "X12") {
    errors.push({
      code: "UNSUPPORTED_DOCUMENT_TYPE",
      message: "Only X12 EDI documents are supported.",
    });
  }
 
  if (!expectedSegments) {
    errors.push({
      code: "UNSUPPORTED_TRANSACTION_TYPE",
      message: "Supported transaction types are 850, 810, 856 and 855.",
    });
  }
 
  const delimiters = detectDelimiters(content);
  const segments = parseSegments(content, delimiters);
  const ids = segments.map((segment) => segment.id);
  const firstIndex = (id) => ids.indexOf(id);
  const lastIndex = (id) => ids.lastIndexOf(id);
  const firstSegment = (id) => segments[firstIndex(id)];
  const lastSegment = (id) => segments[lastIndex(id)];
 
  const requiredEnvelope = ["ISA", "GS", "ST", "SE", "GE", "IEA"];
  const missingSegments = requiredEnvelope.filter((id) => !ids.includes(id));
 
  for (const id of missingSegments) {
    errors.push({
      code: `MISSING_${id}`,
      message: `Required X12 envelope segment ${id} is missing.`,
    });
  }
 
  // Basic envelope ordering checks.
  const order = ["ISA", "GS", "ST", "SE", "GE", "IEA"];
  const presentPositions = order
    .map((id) => ({ id, index: firstIndex(id) }))
    .filter((item) => item.index !== -1);
 
  for (let i = 1; i < presentPositions.length; i++) {
    if (presentPositions[i].index < presentPositions[i - 1].index) {
      errors.push({
        code: "INVALID_ENVELOPE_ORDER",
        message: `${presentPositions[i].id} appears before ${presentPositions[i - 1].id}.`,
      });
    }
  }
 
  const st = firstSegment("ST");
  const se = lastSegment("SE");
  const gs = firstSegment("GS");
  const ge = lastSegment("GE");
  const isa = firstSegment("ISA");
  const iea = lastSegment("IEA");
 
  // Validate transaction type against the ST segment.
  const actualType = st?.elements?.[1]?.trim() || null;
  const transactionTypeValid =
    Boolean(expectedSegments) &&
    Boolean(actualType) &&
    actualType === normalizedType;
 
  if (expectedSegments && !actualType) {
    errors.push({
      code: "MISSING_ST_TRANSACTION_TYPE",
      message: "The ST segment does not contain a transaction type.",
    });
  } else if (expectedSegments && actualType !== normalizedType) {
    errors.push({
      code: "TRANSACTION_TYPE_MISMATCH",
      message: `Expected transaction type ${normalizedType}, but found ${actualType || "none"}.`,
    });
  }
 
  // Check the transaction-specific required segment.
  if (expectedSegments) {
    for (const required of expectedSegments) {
      if (!ids.includes(required)) {
        errors.push({
          code: `MISSING_${required}`,
          message: `Transaction ${normalizedType} requires a ${required} segment.`,
        });
      }
    }
  }
 
  // Control numbers must match within each envelope.
  const controlNumbers = {
    st: st?.elements?.[2]?.trim() || null,
    se: se?.elements?.[2]?.trim() || null,
    gs: gs?.elements?.[6]?.trim() || null,
    ge: ge?.elements?.[2]?.trim() || null,
    isa: isa?.elements?.[13]?.trim() || null,
    iea: iea?.elements?.[2]?.trim() || null,
  };
 
  const controlChecks = [
    {
      start: controlNumbers.st,
      end: controlNumbers.se,
      code: "ST_SE_CONTROL_MISMATCH",
      label: "ST02 and SE02 transaction control numbers do not match.",
    },
    {
      start: controlNumbers.gs,
      end: controlNumbers.ge,
      code: "GS_GE_CONTROL_MISMATCH",
      label: "GS06 and GE02 group control numbers do not match.",
    },
    {
      start: controlNumbers.isa,
      end: controlNumbers.iea,
      code: "ISA_IEA_CONTROL_MISMATCH",
      label: "ISA13 and IEA02 interchange control numbers do not match.",
    },
  ];
 
  for (const check of controlChecks) {
    if (check.start && check.end && check.start !== check.end) {
      errors.push({ code: check.code, message: check.label });
    } else if (!check.start || !check.end) {
      warnings.push({
        code: `${check.code}_NOT_CHECKED`,
        message: `A control number comparison could not be completed: ${check.label}`,
      });
    }
  }
 
  // SE01 should count all segments from ST through SE, inclusive.
  if (st && se && firstIndex("ST") <= lastIndex("SE")) {
    const transactionSegments = segments.slice(
      firstIndex("ST"),
      lastIndex("SE") + 1
    );
    const declaredCount = Number(se.elements[1]);
    if (!Number.isInteger(declaredCount) || declaredCount < 2) {
      errors.push({
        code: "INVALID_SE_SEGMENT_COUNT",
        message: "SE01 must contain a valid transaction segment count.",
      });
    } else if (declaredCount !== transactionSegments.length) {
      errors.push({
        code: "SE_SEGMENT_COUNT_MISMATCH",
        message: `SE01 declares ${declaredCount} segments, but ${transactionSegments.length} were found from ST through SE.`,
      });
    }
  }
 
  // GE01 should match the number of ST transaction sets in the group.
  if (ge) {
    const declaredGroups = Number(ge.elements[1]);
    const transactionCount = segments.filter(
      (segment) => segment.id === "ST"
    ).length;
 
    if (!Number.isInteger(declaredGroups) || declaredGroups < 1) {
      errors.push({
        code: "INVALID_GE_TRANSACTION_COUNT",
        message: "GE01 must contain a valid transaction-set count.",
      });
    } else if (declaredGroups !== transactionCount) {
      errors.push({
        code: "GE_TRANSACTION_COUNT_MISMATCH",
        message: `GE01 declares ${declaredGroups} transaction sets, but ${transactionCount} ST segments were found.`,
      });
    }
  }
 
  // IEA01 should match the number of GS functional groups.
  if (iea) {
    const declaredGroups = Number(iea.elements[1]);
    const groupCount = segments.filter(
      (segment) => segment.id === "GS"
    ).length;
 
    if (!Number.isInteger(declaredGroups) || declaredGroups < 1) {
      errors.push({
        code: "INVALID_IEA_GROUP_COUNT",
        message: "IEA01 must contain a valid functional-group count.",
      });
    } else if (declaredGroups !== groupCount) {
      errors.push({
        code: "IEA_GROUP_COUNT_MISMATCH",
        message: `IEA01 declares ${declaredGroups} functional groups, but ${groupCount} GS segments were found.`,
      });
    }
  }
 
  if (segments.length > 0 && !content.endsWith(delimiters.segment)) {
    warnings.push({
      code: "MISSING_FINAL_SEGMENT_TERMINATOR",
      message: "The document does not end with the detected segment terminator.",
    });
  }
 
  if (segments.length === 0 || !ids.includes("ISA")) {
    errors.push({
      code: "INVALID_X12_DOCUMENT",
      message: "The content does not appear to contain a recognizable X12 interchange.",
    });
  }
 
  // Score is a transparent rule-based indicator, not a certification.
  const complianceScore = Math.max(
    0,
    Math.round(100 - errors.length * 15 - warnings.length * 3)
  );
 
  const structurallyValid = errors.length === 0;
  const status = structurallyValid ? "VALID" : "INVALID";
 
  return {
    fileName,
    documentType,
    transactionType: normalizedType || actualType,
    expectedTransactionType: normalizedType || null,
    actualTransactionType: actualType,
    supplierId: supplierId || null,
    structurallyValid,
    transactionTypeValid,
    status,
    segmentCount: segments.length,
    detectedSegments: ids,
    missingSegments,
    controlNumbers,
    validationErrors: errors,
    warnings,
    complianceScore,
    complianceScoreNote:
      "Rule-based score calculated from detected errors and warnings; not a certification of full X12 or trading-partner compliance.",
  };
}
 
function buildRecommendations(validation) {
  const recommendations = [];
 
  if (validation.validationErrors.length > 0) {
    recommendations.push(
      "Correct the reported validation errors and submit the EDI document again."
    );
  }
 
  if (validation.missingSegments.length > 0) {
    recommendations.push(
      `Review the required envelope segments: ${validation.missingSegments.join(", ")}.`
    );
  }
 
  if (
    validation.validationErrors.some((error) =>
      error.code.includes("CONTROL_MISMATCH")
    )
  ) {
    recommendations.push(
      "Verify that each envelope's opening and closing control numbers match."
    );
  }
 
  if (validation.warnings.length > 0) {
    recommendations.push(
      "Review the warnings because some checks could not be completed or the document may be incomplete."
    );
  }
 
  if (validation.structurallyValid && validation.warnings.length === 0) {
    recommendations.push(
      "The document passed the implemented structural checks. Verify any additional trading-partner-specific requirements before production use."
    );
  }
 
  return recommendations;
}
 
module.exports = {
  validateEdi,
  buildRecommendations,
};