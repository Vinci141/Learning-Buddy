import { StudyMaterials, MindMapNode } from '../types';

// These are expected to be available globally from the scripts in index.html
declare const jspdf: any;
declare const marked: any; // For Markdown parsing

// --- HELPER FUNCTIONS ---

const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  // A simple regex approach to remove common markdown syntax
  return markdown
    // Remove headers (e.g., ### Title)
    .replace(/#{1,6}\s+(.*)/g, '$1')
    // Remove bold/italic (e.g., **bold**, *italic*)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove lists (e.g., * item, 1. item)
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove links but keep the text (e.g., [text](url))
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
    .trim();
};

const markdownToHtml = (markdown: string): string => {
    if (typeof marked !== 'undefined') {
        return marked.parse(markdown);
    }
    // Basic fallback if marked library isn't loaded
    return `<p>${markdown.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
};

const createMindMapHtml = (node: MindMapNode, level: number = 0): string => {
    let html = `<li>${node.topic}</li>`;
    if (node.children && node.children.length > 0) {
        html += `<ul>${node.children.map(child => createMindMapHtml(child, level + 1)).join('')}</ul>`;
    }
    return html;
};

const createHtmlContent = (materials: StudyMaterials, topic: string): string => {
  const { summary, flashcards, quiz, mindMap } = materials;

  const summaryHtml = `<h2>Summary</h2>${markdownToHtml(summary)}`;

  const flashcardsHtml = `<h2>Flashcards</h2><table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr><th style="padding: 8px;">Term</th><th style="padding: 8px;">Definition</th></tr></thead><tbody>${flashcards.map(f => `<tr><td style="padding: 8px;">${f.term}</td><td style="padding: 8px;">${f.definition}</td></tr>`).join('')}</tbody></table>`;
  
  const quizHtml = `<h2>Quiz</h2>${quiz.map((q, i) => `<div style="margin-bottom: 16px;">
    <p><b>${i + 1}. ${q.question}</b></p>
    <ul>${q.options.map(o => `<li>${o}</li>`).join('')}</ul>
    <p><i>Correct Answer: ${q.correctAnswer}</i></p>
  </div>`).join('')}`;
  
  const mindMapHtml = `<h2>Mind Map</h2><ul>${createMindMapHtml(mindMap)}</ul>`;

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
        <br>
        ${mindMapHtml}
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
  link.download = `${topic.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


const addMindMapToPdf = (doc: any, node: MindMapNode, x: number, y: number, level: number = 0): number => {
    let currentY = y;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { top: 20, bottom: 20 };
    
    if (currentY > pageHeight - margins.bottom) {
        doc.addPage();
        currentY = margins.top;
    }

    const indent = level * 5;
    const textLines = doc.splitTextToSize(`- ${node.topic}`, doc.internal.pageSize.getWidth() - x - indent - 20);
    doc.text(textLines, x + indent, currentY);
    currentY += textLines.length * 5;

    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            currentY = addMindMapToPdf(doc, child, x, currentY, level + 1);
        }
    }
    return currentY;
};

export const exportToPdf = (materials: StudyMaterials, topic: string) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  const { summary, flashcards, quiz, mindMap } = materials;

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
  const plainTextSummary = stripMarkdown(summary);
  const summaryLines = doc.splitTextToSize(plainTextSummary, usableWidth);
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
  y += 8;
  doc.setFontSize(10);
  quiz.forEach((q, i) => {
    if (y > pageHeight - 40) { doc.addPage(); y = margins.top; }
    const questionLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, usableWidth);
    doc.text(questionLines, margins.left, y);
    y += (questionLines.length * 5) + 2;

    q.options.forEach(option => {
        if (y > pageHeight - 20) { doc.addPage(); y = margins.top; }
        doc.text(`- ${option}`, margins.left + 5, y);
        y += 5;
    });
    if (y > pageHeight - 20) { doc.addPage(); y = margins.top; }
    doc.text(`Correct Answer: ${q.correctAnswer}`, margins.left + 5, y);
    y += 8;
  });

  // Mind Map
  if (y > pageHeight - 40) { doc.addPage(); y = margins.top; }
  doc.setFontSize(14);
  doc.text('Mind Map', margins.left, y);
  y += 8;
  doc.setFontSize(10);
  addMindMapToPdf(doc, mindMap, margins.left, y);

  doc.save(`${topic.replace(/\s+/g, '_')}.pdf`);
};

const escapeCsvCell = (cell: string): string => {
    if (/[",\n]/.test(cell)) {
        return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
};

const addMindMapToCsv = (node: MindMapNode, level: number = 0): string => {
    let csv = `MindMap,${level},${escapeCsvCell(node.topic)}\r\n`;
    if (node.children) {
        node.children.forEach(child => {
            csv += addMindMapToCsv(child, level + 1);
        });
    }
    return csv;
};

export const exportToCsv = (materials: StudyMaterials, topic: string) => {
    const { summary, flashcards, quiz, mindMap } = materials;
    let csvContent = '';

    // Add Summary
    csvContent += 'Type,Content\r\n';
    const plainTextSummary = stripMarkdown(summary);
    csvContent += `Summary,${escapeCsvCell(plainTextSummary)}\r\n\r\n`;

    // Add Flashcards
    csvContent += 'Type,Term,Definition\r\n';
    flashcards.forEach(f => {
        csvContent += `Flashcard,${escapeCsvCell(f.term)},${escapeCsvCell(f.definition)}\r\n`;
    });
    csvContent += '\r\n';

    // Add Quiz
    csvContent += 'Type,Question,Option 1,Option 2,Option 3,Option 4,Correct Answer\r\n';
    quiz.forEach(q => {
        const options = [...q.options];
        while(options.length < 4) {
            options.push('');
        }
        const optionsCsv = options.slice(0, 4).map(escapeCsvCell).join(',');
        csvContent += `Quiz,${escapeCsvCell(q.question)},${optionsCsv},${escapeCsvCell(q.correctAnswer)}\r\n`;
    });
    csvContent += '\r\n';
    
    // Add Mind Map
    csvContent += 'Type,Level,Topic\r\n';
    csvContent += addMindMapToCsv(mindMap);


    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topic.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};