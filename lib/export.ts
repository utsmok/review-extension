import { getCategoryLabel, getQuestionCode } from "./rubric";
import { buildPdfSummaryPage } from "./nutrition-label";
import type { Capture, Evaluation, RubricData, SessionMetadata } from "./types";

/** Derive capture IDs linked to a rubric question (both directions). */
function getLinkedIds(ev: Evaluation, captures: Capture[]): string[] {
  if (ev.explicitEvidenceIds.length > 0) return ev.explicitEvidenceIds;
  return captures.filter((c) => c.linkedRubricIds.includes(ev.rubricId)).map((c) => c.id);
}

export async function exportSession(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const Papa = (await import("papaparse")).default;

  const zip = new JSZip();
  // biome-ignore lint/style/noNonNullAssertion: JSZip always returns
  const evidenceFolder = zip.folder("evidence")!;

  for (const capture of captures) {
    const base64Data = capture.screenshotBase64.split(",")[1] ?? "";
    evidenceFolder.file(`capture_${capture.id}.png`, base64Data, {
      base64: true,
    });
    evidenceFolder.file(`capture_${capture.id}.html`, capture.htmlContent);
  }

  // session_metadata.csv
  zip.file(
    "session_metadata.csv",
    Papa.unparse([
      {
        Tool_Name: metadata.toolName,
        Tool_URL: metadata.toolUrl,
        Start_Time: metadata.startTime,
        Uses_AI: String(metadata.usesAi ?? true),
        Rubric_Variant: metadata.rubricId ?? "trust-full",
        Company: metadata.company ?? "",
        Pricing: metadata.pricing ?? "",
        Availability: metadata.availability ?? "",
        Terms_Conditions_URL: metadata.termsConditionsUrl ?? "",
        Notes: metadata.notes ?? "",
      },
    ]),
  );

  // rubric_scores.csv — derive linked captures from both directions
  zip.file(
    "rubric_scores.csv",
    Papa.unparse(
      evaluations.map((e) => {
        const [category] = e.rubricId.split(".");
        const linkedIds = getLinkedIds(e, captures);
        return {
          Rubric_Category: getCategoryLabel(category),
          Question_ID: e.rubricId,
          Score: String(e.score),
          Notes: e.notes,
          Linked_Capture_IDs: linkedIds.join("; "),
        };
      }),
    ),
  );

  // capture_log.csv
  zip.file(
    "capture_log.csv",
    Papa.unparse(
      captures.map((c) => ({
        Capture_ID: c.id,
        Timestamp: c.timestamp,
        Page_Title: c.pageTitle,
        URL_Captured: c.sourceUrl,
        User_Notes: c.notes,
        Tagged_Rubric_IDs: c.linkedRubricIds.join("; "),
      })),
    ),
  );

  // PDF report
  const pdfBlob = await buildPdfReport(metadata, captures, evaluations, rubric);
  zip.file(`Evaluation_Report_${metadata.toolName}.pdf`, pdfBlob);

  return zip.generateAsync({ type: "blob" });
}

async function buildPdfReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
): Promise<Uint8Array> {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;

  try {
    const vfs = await import("pdfmake/build/vfs_fonts");
    // biome-ignore lint/suspicious/noExplicitAny: pdfmake has no types
    pdfMake.vfs = (vfs as any).pdfMake?.vfs ?? (vfs as any).default ?? vfs;
  } catch {
    // Roboto fonts bundled in pdfmake/build/pdfmake
  }

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake doc defs are untyped
  const content: any[] = [];

  // ── Nutrition Label Summary (first page) ──
  content.push(...buildPdfSummaryPage(metadata, evaluations, rubric));

  // ── Title ──
  content.push({
    text: "TRUST Evaluation Report",
    style: "title",
  });
  content.push({
    text: metadata.toolName,
    style: "toolName",
  });
  content.push({
    text: metadata.toolUrl,
    link: metadata.toolUrl,
    color: "#2563eb",
    fontSize: 10,
    margin: [0, 0, 0, 4],
  });
  content.push({
    text: `Evaluated: ${new Date(metadata.startTime).toLocaleString()}`,
    fontSize: 9,
    color: "#6b7280",
    margin: [0, 0, 0, 2],
  });
  content.push({
    text: `Rubric: ${rubric.framework_name} v${rubric.version}`,
    fontSize: 9,
    color: "#6b7280",
    margin: [0, 0, 0, 2],
  });
  if (!(metadata.usesAi ?? true)) {
    content.push({
      text: "Note: Tool marked as non-AI. AI-specific questions scored N/A.",
      fontSize: 9,
      color: "#d97706",
      margin: [0, 0, 0, 2],
    });
  }
  if (metadata.company)
    content.push({
      text: `Company: ${metadata.company}`,
      fontSize: 9,
      color: "#6b7280",
      margin: [0, 0, 0, 2],
    });
  if (metadata.pricing)
    content.push({
      text: `Pricing: ${metadata.pricing}`,
      fontSize: 9,
      color: "#6b7280",
      margin: [0, 0, 0, 2],
    });
  if (metadata.notes)
    content.push({
      text: `Notes: ${metadata.notes}`,
      fontSize: 9,
      color: "#6b7280",
      margin: [0, 0, 0, 2],
    });

  content.push({ text: "", margin: [0, 10] });

  // ── Quality Gates ──
  content.push({ text: "Quality Gates", style: "section" });
  content.push({
    text: "Mandatory pass/fail thresholds. Any fail halts the review.",
    fontSize: 8,
    color: "#9ca3af",
    margin: [0, 0, 0, 6],
  });

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake table defs
  const qgBody: any[][] = [
    [
      { text: "Category", style: "th" },
      { text: "Requirement", style: "th" },
      { text: "Result", style: "th" },
      { text: "Notes", style: "th" },
    ],
  ];

  for (const [cat, questions] of Object.entries(rubric.quality_gate)) {
    for (const [qId, q] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      const score = ev?.score || "—";
      const scoreStr = String(score).toUpperCase();
      const color = score === "pass" ? "#16a34a" : score === "fail" ? "#dc2626" : "#6b7280";
      qgBody.push([
        { text: getCategoryLabel(cat), fontSize: 8 },
        { text: q.requirement, fontSize: 8 },
        {
          text: scoreStr,
          fontSize: 9,
          bold: true,
          color,
        },
        { text: ev?.notes ?? "", fontSize: 7, color: "#6b7280" },
      ]);
    }
  }

  content.push({
    table: {
      headerRows: 1,
      widths: [90, "*", 55, 100],
      body: qgBody,
    },
    layout: {
      hLineColor: () => "#e5e7eb",
      hLineWidth: () => 0.5,
      fillColor: (row: number) => (row === 0 ? "#1e40af" : null),
    },
    margin: [0, 0, 0, 10],
  });

  // ── Scoring Rubric ──
  content.push({ text: "Scoring Rubric", style: "section" });

  for (const [cat, questions] of Object.entries(rubric.scoring_rubric)) {
    content.push({
      text: getCategoryLabel(cat),
      style: "category",
    });

    // biome-ignore lint/suspicious/noExplicitAny: pdfmake table defs
    const body: any[][] = [
      [
        { text: "Question", style: "th" },
        { text: "Score", style: "th" },
        { text: "Achieved Level", style: "th" },
        { text: "Notes", style: "th" },
      ],
    ];

    for (const [qId, levels] of Object.entries(questions)) {
      const rubricId = `${cat}.${qId}`;
      const ev = evaluations.find((e) => e.rubricId === rubricId);
      const isNa = ev?.score === "na";
      const score = typeof ev?.score === "number" ? ev.score : -1;
      const qIdx = Object.keys(questions).indexOf(qId);
      const levelDesc = isNa ? "N/A" : score >= 0 ? (levels as unknown as Record<string, string>)[String(score)] : "—";

      body.push([
        { text: `${getQuestionCode(cat, qIdx)} — ${levels.title}`, fontSize: 8 },
        {
          text: isNa ? "N/A" : score >= 0 ? `${score}/3` : "—",
          fontSize: 9,
          bold: true,
          alignment: "center",
          color:
            isNa ? "#6b7280" :
            score >= 2 ? "#16a34a" : score === 1 ? "#d97706" : score === 0 ? "#dc2626" : "#6b7280",
        },
        { text: levelDesc, fontSize: 7, color: "#4b5563" },
        { text: ev?.notes ?? "", fontSize: 7, color: "#6b7280" },
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: [70, 35, "*", 100],
        body,
      },
      layout: {
        hLineColor: () => "#e5e7eb",
        hLineWidth: () => 0.5,
        fillColor: (row: number) => (row === 0 ? "#1e40af" : null),
      },
      margin: [0, 0, 0, 8],
    });
  }

  // ── Evidence Index ──
  if (captures.length > 0) {
    content.push({ text: "", pageBreak: "before" });
    content.push({ text: "Evidence Captures", style: "section" });

    for (const capture of captures) {
      const shortId = capture.id.slice(0, 8);
      content.push({
        columns: [
          {
            image: capture.screenshotBase64,
            width: 120,
            margin: [0, 0, 8, 0],
          },
          {
            stack: [
              {
                text: capture.pageTitle || `Capture ${shortId}`,
                fontSize: 9,
                bold: true,
                margin: [0, 0, 0, 2],
              },
              {
                text: capture.sourceUrl,
                fontSize: 8,
                color: "#2563eb",
                link: capture.sourceUrl,
                margin: [0, 0, 0, 2],
              },
              {
                text: new Date(capture.timestamp).toLocaleString(),
                fontSize: 8,
                color: "#6b7280",
                margin: [0, 0, 0, 2],
              },
              ...(capture.notes
                ? [
                    {
                      text: `Notes: ${capture.notes}`,
                      fontSize: 8,
                      color: "#6b7280",
                    },
                  ]
                : []),
              ...(capture.linkedRubricIds.length > 0
                ? [
                    {
                      text: `Tagged: ${capture.linkedRubricIds.join(", ")}`,
                      fontSize: 7,
                      color: "#9ca3af",
                      margin: [0, 2, 0, 0],
                    },
                  ]
                : []),
            ],
            width: "*",
          },
        ],
        margin: [0, 0, 0, 10],
      });
    }
  }

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [40, 50, 40, 50],
    content,
    styles: {
      title: {
        fontSize: 20,
        bold: true,
        color: "#1e293b",
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      toolName: {
        fontSize: 14,
        bold: true,
        color: "#1e40af",
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      section: {
        fontSize: 13,
        bold: true,
        color: "#374151",
        margin: [0, 10, 0, 4] as [number, number, number, number],
      },
      category: {
        fontSize: 10,
        bold: true,
        color: "#6b7280",
        margin: [0, 6, 0, 4] as [number, number, number, number],
      },
      th: {
        bold: true,
        fontSize: 8,
        color: "#ffffff",
        fillColor: "#1e40af",
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  return new Promise<Uint8Array>((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBuffer((buffer: Uint8Array) => {
      if (buffer) resolve(buffer);
      else reject(new Error("PDF generation failed"));
    });
  });
}
