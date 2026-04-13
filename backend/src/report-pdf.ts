import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CommandResponse } from "./types.js";

const wrapText = (text: string, maxLength: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength) {
      if (current) lines.push(current);
      current = word;
      continue;
    }
    current = candidate;
  }

  if (current) lines.push(current);
  return lines;
};

export const buildFarmReportPdf = async (response: CommandResponse) => {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 44;
  let y = height - margin;

  const drawLine = (text: string, options?: { size?: number; bold?: boolean; color?: [number, number, number] }) => {
    const size = options?.size ?? 11;
    const activeFont = options?.bold ? bold : font;
    const lines = wrapText(text, options?.size && options.size >= 18 ? 52 : 74);

    for (const line of lines) {
      if (y < 70) {
        y = height - margin;
        page = pdf.addPage([595, 842]);
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: activeFont,
        color: options?.color ? rgb(...options.color) : rgb(0.09, 0.16, 0.12),
      });
      y -= size + 5;
    }
  };

  page.drawRectangle({
    x: 0,
    y: height - 110,
    width,
    height: 110,
    color: rgb(0.91, 0.97, 0.93),
  });

  drawLine("AgriSpray AI Farm Report", { size: 24, bold: true, color: [0.07, 0.37, 0.19] });
  drawLine(response.title, { size: 16, bold: true });
  drawLine(response.summary);
  y -= 8;

  drawLine("Key metrics", { size: 14, bold: true });
  response.metrics.forEach((metric) => {
    drawLine(`${metric.label}: ${metric.value}`);
  });
  y -= 8;

  drawLine("Action plan", { size: 14, bold: true });
  response.actions.forEach((action, index) => {
    drawLine(`${index + 1}. ${action.title} (${action.timing})`, { bold: true });
    drawLine(action.detail);
  });

  if (response.table) {
    y -= 8;
    drawLine(response.table.title, { size: 14, bold: true });
    drawLine(response.table.columns.join(" | "), { bold: true });
    response.table.rows.forEach((row) => drawLine(row.join(" | ")));
  }

  if (response.speakText) {
    y -= 8;
    drawLine("Voice summary", { size: 14, bold: true });
    drawLine(response.speakText);
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
};
