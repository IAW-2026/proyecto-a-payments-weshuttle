import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

interface MetricItem {
  label: string;
  value: string | number;
}

interface TableItem {
  title: string;
  headers: string[];
  rows: string[][];
  weights?: number[]; // Proportional widths of columns (must sum up to any number, distributed relatively)
}

export function generatePdfReport({
  title,
  subtitle,
  metrics,
  tables,
}: {
  title: string;
  subtitle?: string;
  metrics: MetricItem[];
  tables: TableItem[];
}): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;

  // 1. Premium Header (Slate gradient feel background)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, margin, 18);

  // Subtitle / Timestamp
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225); // slate-300
  if (subtitle) {
    doc.text(subtitle, margin, 26);
  }
  doc.text(
    `Fecha de generación: ${new Date().toLocaleString("es-AR")}`,
    margin,
    33
  );

  let y = 52;

  // 2. Metrics block
  if (metrics.length > 0) {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);

    const rowsCount = Math.ceil(metrics.length / 2);
    const cardHeight = rowsCount * 12 + 6;
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, "FD");

    metrics.forEach((m, idx) => {
      const col = idx % 2;
      const rowIdx = Math.floor(idx / 2);
      const colWidth = contentWidth / 2;

      const textX = margin + 6 + col * colWidth;
      const textY = y + 8.5 + rowIdx * 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139); // slate-505
      doc.text(`${m.label}:`, textX, textY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(String(m.value), textX + colWidth * 0.42, textY);
    });

    y += cardHeight + 10;
  }

  // 3. Tables
  tables.forEach((table) => {
    if (y > 240) {
      doc.addPage();
      y = margin + 5;
    }

    // Table Header
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(table.title, margin, y);
    y += 5;

    // Draw headers container
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600

    const colWidths = getColWidths(table.headers, contentWidth, table.weights);

    let currentX = margin + 3;
    table.headers.forEach((h, i) => {
      doc.text(h, currentX, y + 5.5);
      currentX += colWidths[i];
    });

    y += 8;

    // Draw rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);

    table.rows.forEach((row, rowIdx) => {
      if (y > 275) {
        doc.addPage();
        y = margin + 5;

        // Redraw headers on new page
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        let headerX = margin + 3;
        table.headers.forEach((h, i) => {
          doc.text(h, headerX, y + 5.5);
          headerX += colWidths[i];
        });

        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
      }

      // Alternate row backgrounds
      if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(margin, y, contentWidth, 6.5, "F");
      }

      let rowX = margin + 3;
      row.forEach((cell, i) => {
        let val = String(cell);
        // Truncate cell content if too long for its column to prevent visual overlaps
        const maxLen = Math.floor(colWidths[i] * 0.48);
        if (val.length > maxLen && maxLen > 5) {
          val = val.substring(0, maxLen - 3) + "...";
        }
        doc.text(val, rowX, y + 4.5);
        rowX += colWidths[i];
      });

      y += 6.5;
    });

    y += 8; // Extra padding after tables
  });

  const pdfData = doc.output("arraybuffer");
  return Buffer.from(pdfData);
}

function getColWidths(headers: string[], totalWidth: number, weights?: number[]): number[] {
  const count = headers.length;
  if (count === 0) return [];
  if (weights && weights.length === count) {
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => (w / sum) * totalWidth);
  }
  return Array(count).fill(totalWidth / count);
}

export function generateExcelReport(sheets: { name: string; data: Record<string, unknown>[] }[]): Buffer {
  const wb = XLSX.utils.book_new();

  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}
