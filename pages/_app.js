import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}

export default MyApp;