import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '量子膜订单竞争榜｜省份加权积分实时大屏',
  description: '按省份与套餐权重实时统计积分、排名和地图热力的活动竞争榜。',
  openGraph: {
    title: '量子膜订单竞争榜',
    description: '省份加权积分实时竞争榜',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '量子膜订单竞争榜',
    description: '省份加权积分实时竞争榜',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
