import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signalgate — Pre-Action Risk Gate for Telegraph Protocol',
  description: 'Actions do not fire until live Telegraph miners agree. Real-time pre-action risk verification powered by decentralized intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        {children}
      </body>
    </html>
  );
}
