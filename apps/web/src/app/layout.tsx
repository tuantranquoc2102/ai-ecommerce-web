import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ToastProvider, TooltipProvider } from '@ecom/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ecom CMS',
  description: 'Headless CMS + e-commerce admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <TooltipProvider delayDuration={300}>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
