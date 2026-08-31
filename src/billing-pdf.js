import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import regularFont from "pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf";
import boldFont from "pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf";

const LEFT = 12;
const RIGHT = 198;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 272;
const INK = "#181818";
const MUTED = "#716b62";
const BORDER = "#d8d0c2";
const GOLD = "#b88913";
const FONT = "LiberationSans"; // Arial-compatible metrics; redistributable font.

function text(element) {
  if (!element) return "";
  const clone = element.cloneNode(true);
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return clone.textContent.trim();
}

// Read the shared preview renderer so labels, dates, amounts and quote-specific
// omissions have one source of truth. No billing calculations are repeated here.
export function readDocument(html) {
  const root = new DOMParser().parseFromString(html, "text/html");
  const all = (selector, parent = root) => [...parent.querySelectorAll(selector)];
  return {
    title: text(root.querySelector("title")),
    heading: text(root.querySelector(".invoiceHeading h1")),
    logoUrl: root.querySelector(".invoiceLogo img")?.getAttribute("src") || "",
    logoFallback: text(root.querySelector(".logoFallback")),
    meta: all(".metaItem").map((el) => [text(el.querySelector(".label")), text(el.querySelector("strong"))]),
    parties: all(".partyCard").map((el) => ({
      label: text(el.querySelector(".label")),
      name: text(el.querySelector("h2")),
      columns: all(".partyContent > div", el).map(text)
    })),
    dates: all(".dateStrip > div").map((el) => [text(el.querySelector(".label")), text(el.querySelector("strong"))]),
    columns: all(".invoiceItems th").map(text),
    rows: all(".invoiceItems tbody tr").map((el) => ({
      code: text(el.querySelector(".itemCode")),
      values: all("td", el).map((cell, index) => index === 0
        ? [...cell.querySelectorAll("span")].map(text).join("\n")
        : text(cell))
    })),
    bankHeading: text(root.querySelector(".bankingBlock h2")),
    bank: all(".bankingRows b").map((el) => [text(el), text(el.nextElementSibling)]),
    bankFallback: text(root.querySelector(".bankingRows")),
    totals: all(".totalRow").map((el) => ({
      label: text(el.querySelector("span")),
      amount: text(el.querySelector("b")),
      dark: el.classList.contains("balance") || el.classList.contains("quoteTotal"),
      grand: el.classList.contains("grand")
    })),
    notes: text(root.querySelector(".notesBlock > div")),
    company: text(root.querySelector(".footerCompany")),
    email: text(root.querySelector(".footerEmail"))
  };
}

async function loadLogo(url) {
  if (!url) return null;
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ""; reject(new Error("Company logo timed out. Please retry or use Print / Preview.")); }, 15000);
    image.crossOrigin = "anonymous";
    image.onerror = () => { clearTimeout(timer); reject(new Error("Company logo could not be loaded. Please retry or use Print / Preview.")); };
    image.onload = () => {
      clearTimeout(timer);
      try {
        const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL("image/png"), ratio: canvas.width / canvas.height });
      } catch {
        reject(new Error("Company logo could not be embedded. Please use Print / Preview or retry."));
      }
    };
    image.src = url;
  });
}

export async function createPdf(model) {
  const logo = await loadLogo(model.logoUrl);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS("LiberationSans-Regular.ttf", regularFont);
  pdf.addFileToVFS("LiberationSans-Bold.ttf", boldFont);
  pdf.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  pdf.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  pdf.setProperties({ title: model.title, creator: "Shiftly", subject: model.heading });
  const style = (size = 8.25, bold = false, color = INK) => {
    pdf.setFont(FONT, bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color);
  };
  const wrap = (value, width, size = 8.25, bold = false) => {
    style(size, bold);
    return pdf.splitTextToSize(String(value || ""), width);
  };
  const write = (lines, x, y, options = {}) => {
    style(options.size || 8.25, options.bold || false, options.color || INK);
    pdf.text(lines, x, y, { baseline: "top", lineHeightFactor: 1.4, align: options.align || "left" });
  };
  const line = (x1, y, x2, color = BORDER, weight = 0.2) => {
    pdf.setDrawColor(color); pdf.setLineWidth(weight); pdf.line(x1, y, x2, y);
  };
  const label = (value, x, y, align = "left") => write(value.toUpperCase(), x, y, { size: 6, bold: true, color: MUTED, align });

  if (logo) {
    const width = Math.min(38, 27 * logo.ratio);
    const height = width / logo.ratio;
    pdf.addImage(logo.data, "PNG", LEFT, 12 + (29 - height) / 2, width, height);
  } else {
    write(wrap(model.logoFallback || model.company, 42, 12, true), LEFT, 18, { size: 12, bold: true });
  }
  write(model.heading, RIGHT, 12, { size: 20.25, bold: true, color: GOLD, align: "right" });
  let metaY = 25;
  for (let row = 0; row < Math.ceil(model.meta.length / 3); row++) {
    let rowHeight = 0;
    for (let col = 0; col < 3; col++) {
      const item = model.meta[row * 3 + col];
      if (!item) continue;
      const x = RIGHT - (2 - col) * 44;
      const lines = wrap(item[1], 39, 8.25, true);
      label(item[0], x, metaY, "right");
      write(lines, x, metaY + 3, { bold: true, align: "right" });
      rowHeight = Math.max(rowHeight, 3 + lines.length * 4.075);
    }
    metaY += rowHeight + 3;
  }
  let y = Math.max(49, metaY + 5);
  line(LEFT, y, RIGHT, INK, 0.5);
  y += 8;
  const cardWidth = (WIDTH - 8) / 2;
  const partyData = model.parties.map((party) => {
    const name = wrap(party.name, cardWidth - 8, 10.5, true);
    const columns = party.columns.map((value) => wrap(value, (cardWidth - 12) / 2));
    const height = Math.max(37, 4 + 3 + name.length * 5.185 + 2 + Math.max(0, ...columns.map((c) => c.length)) * 4.075 + 4);
    return { ...party, name, columns, height };
  });
  const cardHeight = Math.max(37, ...partyData.map((p) => p.height));
  if (y + cardHeight > 240) throw new Error("Company/customer details are too long for the PDF header. Please shorten the details or use Print / Preview.");
  partyData.forEach((party, index) => {
    const x = LEFT + index * (cardWidth + 8);
    pdf.setDrawColor(BORDER); pdf.setLineWidth(0.2); pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2);
    label(party.label, x + 4, y + 4);
    write(party.name, x + 4, y + 7, { size: 10.5, bold: true });
    const columnsY = y + 7 + party.name.length * 5.185 + 2;
    write(party.columns[0] || [], x + 4, columnsY);
    write(party.columns[1] || [], x + cardWidth - 4, columnsY, { align: "right" });
  });
  y += cardHeight + 5;
  model.dates.forEach((item, index) => {
    const x = index ? RIGHT - 1 : LEFT + 1;
    const align = index ? "right" : "left";
    label(item[0], x, y, align);
    write(item[1], x, y + 3, { bold: true, align });
  });
  y += 14;

  autoTable(pdf, {
    startY: y,
    margin: { top: 12, bottom: 25, left: LEFT, right: LEFT },
    tableWidth: WIDTH,
    theme: "plain",
    head: [model.columns.map((value) => value.toUpperCase())],
    body: model.rows.map((row) => row.values),
    showHead: "everyPage",
    rowPageBreak: "avoid",
    styles: { font: FONT, fontSize: 8.25, textColor: INK, cellPadding: { top: 2.1, bottom: 2.1, left: 1.6, right: 1.6 }, halign: "right", valign: "top", lineColor: BORDER, lineWidth: { bottom: 0.15 }, overflow: "linebreak" },
    headStyles: { font: FONT, fontSize: 6, fontStyle: "normal", fillColor: "#f7f4ee", textColor: "#625c53", lineWidth: { top: 0.2, bottom: 0.2 } },
    columnStyles: Object.fromEntries([31, 9, 14, 9, 9, 14, 14].map((percent, index) => [index, { cellWidth: WIDTH * percent / 100, ...(index === 0 ? { halign: "left" } : {}) }])),
    didParseCell(data) {
      if (data.column.index === 0) data.cell.styles.halign = "left";
    },
    willDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 0) return;
      // Keep AutoTable's measured/split lines, but draw the item code in its
      // smaller bold style without changing the table's pagination.
      const lines = data.cell.text;
      const position = data.cell.getTextPos();
      lines.forEach((value, index) => {
        const isCode = value === model.rows[data.row.index]?.code;
        write(value, position.x, data.cell.y + data.cell.padding("top") + index * 8.25 * 1.15 / pdf.internal.scaleFactor,
          isCode ? { size: 6, bold: true, color: MUTED } : {});
      });
      data.cell._billingText = lines;
      data.cell.text = [];
    },
    didDrawCell(data) {
      if (data.cell._billingText) { data.cell.text = data.cell._billingText; delete data.cell._billingText; }
    }
  });
  y = pdf.lastAutoTable.finalY + 7;

  const totalsWidth = (WIDTH - 8) * 0.88 / 1.88;
  const totalsX = RIGHT - totalsWidth;
  const totals = model.totals.map((row) => {
    const amount = wrap(row.amount, totalsWidth * 0.44 - 5, row.dark ? 9.75 : 8.25, true);
    const name = wrap(row.label, totalsWidth * 0.56 - 5, row.dark ? 9.75 : 8.25, row.dark || row.grand);
    return { ...row, name, amount, height: Math.max(row.dark ? 9 : 8, Math.max(name.length, amount.length) * (row.dark ? 4.815 : 4.075) + 4) };
  });
  const totalsHeight = totals.reduce((sum, row) => sum + row.height, 0);
  const bankWidth = totalsX - LEFT - 8;
  const bank = model.bank.map(([key, value]) => ({ key: wrap(key, 34), value: wrap(value, bankWidth - 38) }));
  const bankHeight = model.bankHeading ? 7 + (bank.length ? bank.reduce((sum, row) => sum + Math.max(row.key.length, row.value.length) * 4.075 + 1.6, 0) : 5) : 0;
  const settlementHeight = Math.max(totalsHeight, bankHeight);
  const noteLines = wrap(model.notes, WIDTH);
  const notesHeight = 10 + noteLines.length * 4.075;
  const bottomHeight = settlementHeight + 7 + notesHeight;
  const newPage = () => { pdf.addPage(); return 12; };
  if (bottomHeight <= BOTTOM - 12) {
    if (y + bottomHeight > BOTTOM) y = newPage();
    y = Math.max(y, BOTTOM - bottomHeight);
  } else if (y + settlementHeight + 25 > BOTTOM) {
    y = newPage();
  }
  if (settlementHeight > BOTTOM - 37) throw new Error("Banking or totals details are too long. Please use Print / Preview.");
  if (model.bankHeading) {
    write(model.bankHeading.toUpperCase(), LEFT, y, { size: 9, bold: true });
    let bankY = y + 7;
    if (!bank.length) write(model.bankFallback, LEFT, bankY);
    bank.forEach((row) => {
      write(row.key, LEFT, bankY, { bold: true, color: "#625c53" });
      write(row.value, LEFT + 38, bankY);
      bankY += Math.max(row.key.length, row.value.length) * 4.075 + 1.6;
    });
  }
  let totalY = y;
  totals.forEach((row, index) => {
    if (row.dark) {
      pdf.setFillColor(INK);
      pdf.roundedRect(totalsX, totalY, totalsWidth, row.height, 2, 2, "F");
      pdf.rect(totalsX, totalY, totalsWidth, row.height - 2, "F");
    }
    if (row.grand) line(totalsX, totalY, RIGHT, GOLD);
    const size = row.dark ? 9.75 : 8.25;
    write(row.name, totalsX + 2.6, totalY + 2, { size, bold: row.dark || row.grand, color: row.dark ? "#ffffff" : "#625c53" });
    write(row.amount, RIGHT - 2.6, totalY + 2, { size, bold: true, color: row.dark ? "#ffffff" : INK, align: "right" });
    totalY += row.height;
    if (index < totals.length - 1) line(totalsX, totalY, RIGHT);
  });
  pdf.setDrawColor(BORDER); pdf.setLineWidth(0.2); pdf.roundedRect(totalsX, y, totalsWidth, totalsHeight, 2, 2);
  y += settlementHeight + 7;
  let remaining = noteLines.slice();
  do {
    if (y + 10 + Math.min(1, remaining.length) * 4.075 > BOTTOM + 0.01) y = newPage();
    line(LEFT, y, RIGHT);
    write(remaining.length === noteLines.length ? "NOTES" : "NOTES (CONTINUED)", LEFT, y + 3, { size: 9, bold: true });
    y += 10;
    const count = Math.max(1, Math.floor((BOTTOM - y) / 4.075));
    write(remaining.splice(0, count), LEFT, y);
    if (remaining.length) y = newPage();
  } while (remaining.length);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    line(LEFT, 279, RIGHT);
    write(wrap(model.company, WIDTH * 0.32, 6), LEFT, 282, { size: 6, color: MUTED });
    write(wrap(model.email, WIDTH * 0.32, 6), 105, 282, { size: 6, color: MUTED, align: "center" });
    write(`Page ${page} of ${pages}`, RIGHT, 282, { size: 6, color: MUTED, align: "right" });
  }
  return pdf;
}

export async function download(html) {
  const model = readDocument(html);
  const pdf = await createPdf(model);
  await pdf.save(`${model.title}.pdf`, { returnPromise: true });
}
