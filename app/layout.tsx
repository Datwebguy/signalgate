import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signalgate — Autonomous Pre-Action Risk Protocol',
  description: 'Actions do not fire until live Telegraph miners agree. Decentralized, multi-miner pre-action risk firewall and consensus verification for Web3 & AI agents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#07090e] text-[#f3f4f6] antialiased selection:bg-emerald-500/25 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
