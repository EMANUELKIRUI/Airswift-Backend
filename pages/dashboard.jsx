import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  if (loading) return <div>Loading...</div>;

  if (!user) return null;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>Dashboard</h1>
        <button onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
        }}>Logout</button>
      </div>

      <p>Welcome, {user.email} ({user.role})</p>

      {user.role === 'admin' ? (
        <div>
          <h2>Admin Dashboard</h2>
          <div style={{ marginTop: '20px' }}>
            <Link href="/applications" style={{ marginRight: '10px' }}>
              View Applications
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h2>User Dashboard</h2>
          <div style={{ marginTop: '20px' }}>
            <Link href="/apply" style={{ marginRight: '10px' }}>
              View Jobs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
