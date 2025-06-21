import './globals.css'; // ✅ add this line at the top
import { AuthProvider } from '@/contexts/AuthContext';
import { SearchHistoryProvider } from '@/contexts/SearchHistoryContext';
import { ModalProvider } from '@/contexts/ModalContext';
import AuthModal from '@/components/AuthModal';

export const metadata = {
  title: 'Image Extractor',
  description: 'Extract images from any public website',
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
      <body className="text-gray-200 min-h-screen">
        <AuthProvider>
          <SearchHistoryProvider>
            <ModalProvider>
              <div className="min-h-screen">
                {children}
              </div>
              <AuthModal />
            </ModalProvider>
          </SearchHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
