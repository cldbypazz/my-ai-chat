import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My AI Assistant',
  description: 'A simple space to ask questions and think things through.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
