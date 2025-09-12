import { StudyMaterials } from '../types';

// These are expected to be available globally from the scripts in index.html
declare const jspdf: any;

const createHtmlContent = (materials: StudyMaterials, topic: string): string => {
  const { summary, flashcards, quiz } = materials;

  const summaryHtml = `<h2>Summary</h2><p>${summary.replace(/\n/g, '<br>')}</p>`;

  const flashcardsHtml = `<h2>Flashcards</h2><table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr><th style="padding: 8px;">Term</th><th style="padding: 8px;">Definition</th></tr></thead><tbody>${flashcards.map(f => `<tr><td style="padding: 8px;">${f.term}</td><td style="padding: 8px;">${f.definition}</td></tr>`).join('')}</tbody></table>`;
  
  const quizHtml = `<h2>Quiz</h2>${quiz.map((q, i) => `<div style="margin-bottom: 16px;">
    <p><b>${i + 1}. ${q.question}</b></p>
    <ul>${q.options.map(o => `<li>${o}</li>`).join('')}</ul>
    <p><i>Correct Answer: ${q.correctAnswer}</i></p>
  </div>`).join('')}`;

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Study Materials: ${topic}</title>
      </head>
      <body style="font-family: sans-serif;">
        <h1>Study Materials: ${topic}</h1>
        ${summaryHtml}
        <br>
        ${flashcardsHtml}
        <br>
        ${quizHtml}
      </body>
    </html>
  `;
};

export const exportToDoc = (materials: StudyMaterials, topic: string) => {
  const htmlContent = createHtmlContent(materials, topic);
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${topic.replace(/\s+/g, '_')}_study_materials.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPdf = (materials: StudyMaterials, topic: string) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  const { summary, flashcards, quiz } = materials;

  const margins = { top: 20, right: 20, bottom: 20, left: 20 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margins.left - margins.right;

  // Title
  doc.setFontSize(18);
  doc.text(`Study Materials: ${topic}`, margins.left, margins.top);
  let y = margins.top + 15;

  // Summary
  doc.setFontSize(14);
  doc.text('Summary', margins.left, y);
  y += 8;
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(summary, usableWidth);
  doc.text(summaryLines, margins.left, y);
  y += (summaryLines.length * 5) + 10;

  // Flashcards
  if (y > pageHeight - 40) { doc.addPage(); y = margins.top; }
  doc.setFontSize(14);
  doc.text('Flashcards', margins.left, y);
  y += 8;
  (doc as any).autoTable({
    startY: y,
    head: [['Term', 'Definition']],
    body: flashcards.map(f => [f.term, f.definition]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Quiz
  if (y > pageHeight - 40) { doc.addPage(); y = margins.top; }
  doc.setFontSize(14);
  doc.text('Quiz', margins.left, y);
  y += 