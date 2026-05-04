import { getCategoryLabel, getQuestionCode } from "./rubric";
import { buildPdfSummaryPage } from "./nutrition-label";
import { PRINCIPLE_COLORS } from "./principles";
import { scoreIndicatorUrl } from "./pdf-score-indicator";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

const PDF_IMAGE_MAX_WIDTH = 500;
const PDF_IMAGE_JPEG_QUALITY = 0.8;

function downscaleImage(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  if (typeof Image === "undefined") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) { resolve(dataUrl); return; }
      const scale = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportSession(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
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

  zip.file(
    "rubric_scores.csv",
    Papa.unparse(
      evaluations.map((e) => {
        const [category] = e.rubricId.split(".");
        return {
          Rubric_Category: getCategoryLabel(category),
          Question_ID: e.rubricId,
          Score: String(e.score),
          Notes: e.notes,
          Linked_Capture_IDs: e.explicitEvidenceIds.join("; "),
        };
      }),
    ),
  );

  zip.file(
    "capture_log.csv",
    Papa.unparse(
      captures.map((c) => ({
        Capture_ID: c.id,
        Timestamp: c.timestamp,
        Page_Title: c.pageTitle,
        URL_Captured: c.sourceUrl,
        User_Notes: c.notes,
        Tagged_Rubric_IDs: evaluations
          .filter((e) => e.explicitEvidenceIds.includes(c.id))
          .map((e) => e.rubricId)
          .join("; "),
      })),
    ),
  );

  if (finalization) {
    zip.file(
      "review_conclusions.csv",
      Papa.unparse([
        {
          Grade: finalization.grade,
          Conclusion: finalization.conclusion,
          Strengths: finalization.strengths.join("; "),
          Weaknesses: finalization.weaknesses.join("; "),
          Recommendations: finalization.recommendations,
          Finalized_At: finalization.finalizedAt,
        },
      ]),
    );
  }

  const pdfBlob = await buildPdfReport(metadata, captures, evaluations, rubric, finalization);
  zip.file(`Evaluation_Report_${metadata.toolName}.pdf`, pdfBlob);

  return zip.generateAsync({ type: "blob" });
}

async function buildPdfReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<Uint8Array> {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;

  try {
    const vfs = await import("pdfmake/build/vfs_fonts");
    // biome-ignore lint/suspicious/noExplicitAny: pdfmake has no types
    pdfMake.vfs = (vfs as any).pdfMake?.vfs ?? (vfs as any).default ?? vfs;
  } catch {
    // Roboto fonts bundled in pdfmake/build/pdfmake
  }

  const { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } = await import("./pdf-logos");

  // Downscale capture images for PDF embedding
  const downscaled = new Map<string, string>();
  await Promise.all(
    captures.map(async (c) => {
      const src = c.annotatedScreenshotBase64 ?? c.screenshotBase64;
      downscaled.set(c.id, await downscaleImage(src, PDF_IMAGE_MAX_WIDTH, PDF_IMAGE_JPEG_QUALITY));
    }),
  );

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake doc defs are untyped
  const content: any[] = [];

  // ── Nutrition Label Summary (first page) ──
  content.push(...await buildPdfSummaryPage(metadata, evaluations, rubric, finalization));

  // ── Title block ──
  content.push({
    columns: [
      { image: TRUST_LOGO, width: 150, margin: [0, 4, 0, 0] },
      {
        stack: [
          {
            text: "Review Report",
            fontSize: 14,
            color: "#172033",
            margin: [0, 10, 0, 4],
          },
          {
            text: metadata.toolName,
            fontSize: 16,
            bold: true,
            color: "#172033",
            margin: [0, 0, 0, 2],
          },
          {
            text: metadata.toolUrl,
            link: metadata.toolUrl,
            color: "#2563eb",
            fontSize: 9,
            margin: [0, 0, 0, 0],
          },
        ],
        width: "*",
        alignment: "right",
      },
    ],
    margin: [0, 0, 0, 6],
  });
  content.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#dde1e7" }],
    margin: [0, 0, 0, 4],
  });

  // ── Centered metadata row ──
  const metaItems: any[] = [
    { text: `Evaluated: ${new Date(metadata.startTime).toLocaleString()}`, fontSize: 8, color: "#576578" },
    { text: "  |  ", fontSize: 8, color: "#dde1e7" },
    { text: `Rubric: ${rubric.framework_name} v${rubric.version}`, fontSize: 8, color: "#576578" },
  ];
  if (!(metadata.usesAi ?? true)) {
    metaItems.push({ text: "  |  ", fontSize: 8, color: "#dde1e7" });
    metaItems.push({ text: "Non-AI tool — AI questions scored N/A", fontSize: 8, color: "#ea580c" });
  }
  content.push({ text: metaItems, alignment: "center", margin: [0, 0, 0, 4] });

  if (metadata.company || metadata.pricing) {
    const extra: any[] = [];
    if (metadata.company) extra.push({ text: metadata.company, fontSize: 8, color: "#576578" });
    if (metadata.company && metadata.pricing) extra.push({ text: " · ", fontSize: 8, color: "#dde1e7" });
    if (metadata.pricing) extra.push({ text: metadata.pricing, fontSize: 8, color: "#576578" });
    content.push({ text: extra, alignment: "center", margin: [0, 0, 0, 4] });
  }
  if (metadata.notes) {
    content.push({ text: metadata.notes, fontSize: 8, color: "#576578", italics: true, alignment: "center", margin: [0, 0, 0, 4] });
  }

  content.push({ text: "", margin: [0, 6] });

  // ── Quality Gates ──
  content.push({
    text: "Quality Gates",
    fontSize: 12,
    bold: true,
    color: "#8e036c",
    characterSpacing: 0.5,
    margin: [0, 0, 0, 6],
  });

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake table defs
  const qgBody: any[][] = [
    [
      { text: "Code", style: "th" },
      { text: "Result", style: "th" },
      { text: "Requirement", style: "th" },
      { text: "Notes", style: "th" },
    ],
  ];

  for (const [cat, questions] of Object.entries(rubric.quality_gate)) {
    for (const [qId, q] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      const score = ev?.score || "—";
      const scoreStr = String(score).toUpperCase();
      const color = score === "pass" ? "#4a8355" : score === "fail" ? "#c60c30" : "#576578";
      qgBody.push([
        { text: `${cat.toUpperCase()}${Object.keys(questions).indexOf(qId) + 1}`, fontSize: 8, bold: true, color: "#576578", margin: [0, 2, 0, 2] },
        { text: scoreStr, fontSize: 9, bold: true, color, alignment: "center", margin: [0, 2, 0, 2] },
        { text: q.requirement, fontSize: 7, color: "#172033", margin: [0, 2, 0, 2] },
        { text: ev?.notes ?? "", fontSize: 7, color: "#576578", margin: [0, 2, 0, 2] },
      ]);
    }
  }

  content.push({
    table: {
      headerRows: 1,
      widths: [32, 40, "*", "*"],
      body: qgBody,
    },
    layout: {
      hLineColor: () => "#e8eaee",
      hLineWidth: () => 0.5,
      fillColor: (row: number) => (row === 0 ? "#002c5f" : null),
      paddingLeft: (col: number) => col < 2 ? 3 : 4,
      paddingRight: (col: number) => col < 2 ? 3 : 4,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    margin: [0, 0, 0, 14],
  });

  // ── Scoring Rubric — one table per category, each on new page ──
  let firstCategory = true;
  for (const [cat, questions] of Object.entries(rubric.scoring_rubric)) {
    const accentColor = PRINCIPLE_COLORS[cat] ?? "#002c5f";

    if (!firstCategory) {
      content.push({ text: "", pageBreak: "before" });
    }
    firstCategory = false;

    content.push({
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: accentColor }],
      margin: [0, 0, 0, 0],
    });

    // biome-ignore lint/suspicious/noExplicitAny: pdfmake table defs
    const body: any[][] = [
      [
        { text: getCategoryLabel(cat), style: "th", colSpan: 4 },
        {}, {}, {},
      ],
      [
        { text: "Code", style: "th" },
        { text: "Score", style: "th" },
        { text: "Level", style: "th" },
        { text: "Reasoning", style: "th" },
      ],
    ];

    for (const [qId, levels] of Object.entries(questions)) {
      const rubricId = `${cat}.${qId}`;
      const ev = evaluations.find((e) => e.rubricId === rubricId);
      const isNa = ev?.score === "na";
      const score = typeof ev?.score === "number" ? ev.score : -1;
      const qIdx = Object.keys(questions).indexOf(qId);
      const code = getQuestionCode(cat, qIdx);

      const levelDesc = isNa ? "Not applicable" : score >= 0
        ? (levels as unknown as Record<string, string>)[String(score)] ?? "—"
        : "—";

      // Score indicator image
      const indicatorUrl = scoreIndicatorUrl(isNa ? "na" : score >= 0 ? score as 0|1|2|3 : -1);

      // Fixed-height cell for level description (2 lines)
      const levelContent: any = {
        text: levelDesc,
        fontSize: 7,
        color: "#576578",
        lineHeight: 1.3,
      };

      body.push([
        { text: code, fontSize: 8, bold: true, color: accentColor, margin: [0, 3, 0, 3] },
        { image: indicatorUrl, width: 30, margin: [0, 4, 0, 4] },
        levelContent,
        { text: ev?.notes ?? "", fontSize: 7, color: "#172033", margin: [0, 3, 0, 3] },
      ]);

      // Evidence images inline
      const linkedCaptures = captures.filter((c) => ev?.explicitEvidenceIds.includes(c.id));
      if (linkedCaptures.length > 0) {
        for (const cap of linkedCaptures) {
          body.push([
            {
              image: downscaled.get(cap.id) ?? cap.screenshotBase64,
              width: 200,
              colSpan: 4,
              alignment: "center",
              margin: [0, 2, 0, 0],
            },
            {}, {}, {},
          ]);
          body.push([
            {
              text: [
                { text: cap.pageTitle || "Capture", fontSize: 7, bold: true },
                { text: ` — ${new Date(cap.timestamp).toLocaleString()}`, fontSize: 7, color: "#576578" },
                ...(cap.notes ? [{ text: `\n${cap.notes}`, fontSize: 7, color: "#576578", italics: true }] : []),
              ],
              colSpan: 4,
              margin: [0, 0, 0, 4],
            },
            {}, {}, {},
          ]);
        }
      }
    }

    content.push({
      table: {
        headerRows: 2,
        widths: [32, 40, 110, "*"],
        body,
      },
      layout: {
        hLineColor: () => "#e8eaee",
        hLineWidth: (i: number, node: any) => {
          if (i === 0 || i === 1) return 0.5;
          return 0.3;
        },
        fillColor: (row: number) => (row <= 1 ? accentColor : null),
        paddingLeft: (col: number) => col < 2 ? 3 : 4,
        paddingRight: (col: number) => col < 2 ? 3 : 4,
        paddingTop: () => 1,
        paddingBottom: () => 1,
      },
      margin: [0, 0, 0, 10],
    });
  }

  // ── Conclusions Page ──
  if (finalization) {
    const gradeColors: Record<string, string> = { pass: "#4a8355", conditional: "#ea580c", fail: "#c60c30" };
    const gradeLabels: Record<string, string> = { pass: "PASSED", conditional: "CONDITIONAL", fail: "FAILED" };
    const gradeColor = gradeColors[finalization.grade] ?? "#576578";
    const gradeLabel = gradeLabels[finalization.grade] ?? finalization.grade.toUpperCase();

    content.push({ text: "", pageBreak: "before" });
    content.push({
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, color: "#8e036c" }],
      margin: [0, 0, 0, 8],
    });
    content.push({
      text: "REVIEW CONCLUSIONS",
      fontSize: 12,
      bold: true,
      color: "#8e036c",
      characterSpacing: 0.5,
      margin: [0, 0, 0, 8],
    });

    // Grade banner
    content.push({
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, color: gradeColor }],
      margin: [0, 0, 0, 0],
    });
    content.push({
      table: {
        widths: ["*"],
        body: [[
          {
            text: gradeLabel,
            fontSize: 22,
            bold: true,
            color: gradeColor,
            alignment: "center",
            margin: [0, 8, 0, 8],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => "#f8f9fb",
      },
      margin: [0, 0, 0, 8],
    });

    if (finalization.conclusion) {
      content.push({ text: "Conclusion", fontSize: 10, bold: true, color: "#172033", margin: [0, 0, 0, 4] });
      content.push({ text: finalization.conclusion, fontSize: 9, color: "#172033", lineHeight: 1.4, margin: [0, 0, 0, 10] });
    }

    if (finalization.strengths.length > 0) {
      content.push({ text: "Strengths", fontSize: 10, bold: true, color: "#4a8355", margin: [0, 0, 0, 4] });
      content.push({
        ul: finalization.strengths.map((s) => ({ text: s, fontSize: 9, color: "#172033" })),
        margin: [0, 0, 0, 10],
      });
    }

    if (finalization.weaknesses.length > 0) {
      content.push({ text: "Weaknesses", fontSize: 10, bold: true, color: "#c60c30", margin: [0, 0, 0, 4] });
      content.push({
        ul: finalization.weaknesses.map((w) => ({ text: w, fontSize: 9, color: "#172033" })),
        margin: [0, 0, 0, 10],
      });
    }

    if (finalization.recommendations) {
      content.push({ text: "Recommendations", fontSize: 10, bold: true, color: "#172033", margin: [0, 0, 0, 4] });
      content.push({ text: finalization.recommendations, fontSize: 9, color: "#172033", lineHeight: 1.4, margin: [0, 0, 0, 10] });
    }

    content.push({
      text: `Finalized ${new Date(finalization.finalizedAt).toLocaleString()}`,
      fontSize: 8,
      color: "#8b9bb0",
      alignment: "right",
      margin: [0, 4, 0, 0],
    });
  }

  // ── Unlinked Evidence Index ──
  const unlinkedCaptures = captures.filter(
    (c) => !evaluations.some((e) => e.explicitEvidenceIds.includes(c.id)),
  );

  if (unlinkedCaptures.length > 0) {
    content.push({ text: "", pageBreak: "before" });
    content.push({
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: "#8e036c" }],
      margin: [0, 0, 0, 6],
    });
    content.push({
      text: "Additional Evidence",
      fontSize: 12,
      bold: true,
      color: "#8e036c",
      characterSpacing: 0.5,
      margin: [0, 0, 0, 6],
    });

    for (const capture of unlinkedCaptures) {
      const img = downscaled.get(capture.id) ?? capture.screenshotBase64;
      content.push({
        columns: [
          { image: img, width: 280, margin: [0, 0, 8, 0] },
          {
            stack: [
              { text: capture.pageTitle || "Capture", fontSize: 10, bold: true, color: "#172033", margin: [0, 0, 0, 4] },
              { text: capture.sourceUrl, fontSize: 8, color: "#2563eb", link: capture.sourceUrl, margin: [0, 0, 0, 4] },
              { text: new Date(capture.timestamp).toLocaleString(), fontSize: 8, color: "#576578", margin: [0, 0, 0, 4] },
              ...(capture.notes ? [{ text: capture.notes, fontSize: 8, color: "#576578", italics: true }] : []),
            ],
            width: "*",
          },
        ],
        margin: [0, 0, 0, 14],
      });
    }
  }

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [40, 48, 40, 48],
    content,
    header: (currentPage: number) => {
      if (currentPage <= 2) return null;
      return {
        columns: [
          { image: TRUST_LOGO, width: 60, margin: [40, 14, 0, 0] },
          {
            text: metadata.toolName,
            fontSize: 7,
            color: "#576578",
            alignment: "right",
            margin: [0, 20, 40, 0],
          },
        ],
      };
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { image: LISA_EIS_LOGO, width: 40, margin: [40, 0, 6, 0] },
        { image: UT_LOGO, width: 24, margin: [0, 4, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, fontSize: 7, color: "#8b9bb0", alignment: "right", margin: [0, 6, 40, 0] },
      ],
      margin: [0, 10, 0, 0],
    }),
    styles: {
      th: { bold: true, fontSize: 7, color: "#ffffff" },
    },
    defaultStyle: { font: "Roboto" },
  };

  return new Promise<Uint8Array>((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBuffer((buffer: Uint8Array) => {
      if (buffer) resolve(buffer);
      else reject(new Error("PDF generation failed"));
    });
  });
}
