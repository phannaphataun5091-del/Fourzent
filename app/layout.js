import './globals.css';

export const metadata = {
  title: 'Fourzent',
  description: 'รีวิวและเครดิตจากลูกค้า',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
