import { NextResponse } from 'next/server';
import { extractPdfText } from '@/lib/pdf';
import { decideFile } from '@/lib/file-policy';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    const decision = decideFile(file.type, file.size);
    if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: 422 });
    const text = await extractPdfText(file);
    if (!text) return NextResponse.json({ error: 'PDF 中没有可提取文本，请使用粘贴文本兜底' }, { status: 422 });
    return NextResponse.json({ text: text.slice(0, 12000) });
  } catch { return NextResponse.json({ error: 'PDF 读取失败，请尝试粘贴文本' }, { status: 422 }); }
}
