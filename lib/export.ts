import type { SessionMetadata, Capture, Evaluation } from './types';
import { TRUST_RUBRIC, getCategoryLabel } from './rubric';

export async function exportSession(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const Papa = (await import('papaparse')).default;

  const zip = new JSZip();
  const evidenceFolder = zip.folder('evidence')!;

  // Write capture files
  for (const capture of captures) {
    const base64Data = capture.screenshotBase64.split(',')[1] ?? '';
    evidenceFolder.file(`capture_${capture.id}.png`, base64Data, {
      base64: true,
    });
    evidenceFolder.file(`capture_${capture.id}.html`, capture.htmlContent);
  }

  // session_metadata.csv
  zip.file(
    'session_metadata.csv',
    Papa.unparse([
      {
        Tool_Name: metadata.toolName,
        Tool_URL: metadata.toolUrl,
        Start_Time: metadata.startTime,
        Company: metadata.company ?? '',
        Pricing: metadata.pricing ?? '',
        Availability: metadata.availability ?? '',
        Terms_Conditions_URL: metadata.termsConditionsUrl ?? '',
      },
    ]),
  );

  // rubric_scores.csv
  zip.file(
    'rubric_scores.csv',
    Papa.unparse(
      evaluations.map((e) => {
        const [category, ...rest] = e.rubricId.split('.');
        return {
          Rubric_Category: getCategoryLabel(category),
          Question_ID: e.rubricId,
          Score: e.score,
          Notes: e.notes,
          Linked_Capture_IDs: e.explicitEvidenceIds.join('; '),
        };
      }),
    ),
  );

  // capture_log.csv
  zip.file(
    'capture_log.csv',
    Papa.unparse(
      captures.map((c) => ({
        Capture_ID: c.id,
        Timestamp: c.timestamp,
        URL_Captured: c.sourceUrl,
        User_Notes: c.notes,
        Tagged_Rubric_IDs: c.linkedRubricIds.join('; '),
      })),
    ),
  );

  // PDF report
  const pdfDoc = await buildPdfReport(metadata, captures, evaluations);
  zip.file(`Evaluation_Report_${metadata.toolName}.pdf`, pdfDoc);

  return zip.generateAsync({ type: 'blob' });
}

async function buildPdfReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
): Promise<Blob> {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  // pdfmake requires vfs fonts — use default for now
  const content: any[] = [];

  content.push({ text: 'TRUST Evaluation Report', style: 'header' });
  content.push({
    text: `Tool: ${metadata.toolName}`,
    style: 'subheader',
  });
  content.push(`URL: ${metadata.toolUrl}`);
  content.push(`Date: ${metadata.startTime}`);
  if (metadata.company) content.push(`Company: ${metadata.company}`);
  content.push({ text: '', margin: [0, 10] });

  // Quality gates
  content.push({
    text: 'Quality Gates',
    style: 'subheader',
  });
  for (const [cat, questions] of Object.entries(
    TRUST_RUBRIC.quality_gate,
  )) {
    for (const [qId, q] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      content.push(
        `${getCategoryLabel(cat)} / ${qId}: ${ev?.score ?? 'N/A'} — ${q.requirement}`,
      );
    }
  }
  content.push({ text: '', margin: [0, 10] });

  // Scoring rubric
  content.push({ text: 'Scoring Rubric', style: 'subheader' });
  for (const [cat, questions] of Object.entries(
    TRUST_RUBRIC.scoring_rubric,
  )) {
    content.push({
      text: getCategoryLabel(cat),
      style: 'categoryHeader',
    });
    for (const [qId, levels] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      content.push(`  ${qId}: Score ${ev?.score ?? 'N/A'}/3`);
      if (ev?.notes) content.push(`    Notes: ${ev.notes}`);
    }
  }

  return new Promise((resolve, reject) => {
    pdfMake.createPdf({ content }).getBlob((blob: Blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PDF generation failed'));
    });
  });
}
