import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <h1>🚀 Airswift</h1>
          <div>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h2>Find Your Dream Job with Airswift</h2>
          <p>Simple. Fast. Effective.</p>
          <div className={styles.ctaButtons}>
            <Link href="/register" className={styles.primaryBtn}>
              Get Started
            </Link>
            <Link href="/login" className={styles.secondaryBtn}>
              Login
            </Link>
          </div>
        </section>

        <section className={styles.features}>
          <h3>How It Works</h3>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <h4>👤 Register</h4>
              <p>Create an account in seconds</p>
            </div>
            <div className={styles.feature}>
              <h4>💼 Browse Jobs</h4>
              <p>Explore available positions</p>
            </div>
            <div className={styles.feature}>
              <h4>📲 Apply</h4>
              <p>Apply with one click</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
