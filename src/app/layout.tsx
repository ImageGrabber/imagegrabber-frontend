import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { SearchHistoryProvider } from '@/contexts/SearchHistoryContext';
import { ClassificationHistoryProvider } from '@/contexts/ClassificationHistoryContext';
import AuthModal from '@/components/AuthModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ImageGrabber - Extract Images From Any Website',
  description: 'Easily extract and download all images from any website with our powerful image scraping tool. Perfect for designers, marketers, and developers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ModalProvider>
            <SearchHistoryProvider>
              <ClassificationHistoryProvider>
                <div className="min-h-screen">
                  {children}
                </div>
              </ClassificationHistoryProvider>
            </SearchHistoryProvider>
            <AuthModal />
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
