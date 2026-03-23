import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import ScreenTips from './components/ScreenTips';
import ErrorBoundary from './components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'iEdu - Nền tảng Học tập Thông minh',
  description: 'Nền tảng học tiếng Anh thông minh với Đồ thị Tri thức và Trí tuệ Nhân tạo',
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress noisy extension-related errors that are not from the app
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('A listener indicated an asynchronous response') ||
         event.reason.message.includes('Could not establish connection'))) {
      event.preventDefault();
    }
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
            <ScreenTips />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
