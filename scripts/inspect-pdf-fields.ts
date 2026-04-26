import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const pdfBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'Allianz.pdf'));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log(`\nTotal AcroForm fields: ${fields.length}\n`);
  fields.forEach((f) => {
    console.log(`  [${f.constructor.name}] ${f.getName()}`);
  });
  console.log();
}

main().catch(console.error);
