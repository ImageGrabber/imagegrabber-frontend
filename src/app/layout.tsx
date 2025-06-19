import './globals.css'; // ✅ add this line at the top
import { AuthProvider } from '@/contexts/AuthContext';
import { SearchHistoryProvider } from '@/contexts/SearchHistoryContext';

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
      <body>
        <AuthProvider>
          <SearchHistoryProvider>
            {children}
          </SearchHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
