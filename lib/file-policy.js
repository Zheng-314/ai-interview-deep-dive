const SUPPORTED_PDF = ['application/pdf'];
const SUPPORTED_IMAGE = ['image/jpeg','image/png','image/webp'];

function decideFile(fileType, fileSizeBytes) {
  if (fileSizeBytes > 5 * 1024 * 1024) return { ok: false, error: '文件不能超过 5MB' };
  if (SUPPORTED_PDF.includes(fileType)) return { ok: true, kind: 'pdf' };
  if (SUPPORTED_IMAGE.includes(fileType)) return { ok: false, error: '图片识别暂未开放：请将 JD 文字复制粘贴到文本框，或改用 PDF 上传。你的图片不会被保存。' };
  return { ok: false, error: '仅支持 PDF 上传（JPG/PNG/WebP 识别暂未开放）；也可以直接粘贴文本' };
}

module.exports = { decideFile };
