import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '深挖面试官', description: '基于 JD 与简历的 AI 递进式面试模拟器' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="zh-CN"><body>{children}</body></html>; }
