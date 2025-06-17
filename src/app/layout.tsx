import './globals.css'; // ✅ add this line at the top

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
      <body>{children}</body>
    </html>
  );
}
