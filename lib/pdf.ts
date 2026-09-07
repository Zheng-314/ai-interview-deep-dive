import pdf from 'pdf-parse';
export async function extractPdfText(file: File) { const buffer = Buffer.from(await file.arrayBuffer()); const result = await pdf(buffer); return result.text.trim(); }
