import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowRight, FiCheckCircle, FiUsers, FiBriefcase, FiTarget, FiStar } from 'react-icons/fi';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: '🎯',
      title: 'Precision Matching',
      description: 'AI-powered candidate matching ensures the best fit for every role'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Streamlined hiring process that saves time and resources'
    },
    {
      icon: '🔒',
      title: 'Secure & Verified',
      description: 'Enterprise-grade security with document verification'
    },
    {
      icon: '📊',
      title: 'Real-Time Analytics',
      description: 'Track applications and candidates with advanced dashboards'
    }
  ];

  const stats = [
    { number: '120+', label: 'Companies' },
    { number: '200+', label: 'Job Listings' },
    { number: '5k+', label: 'Candidates' },
    { number: '99%', label: 'Success Rate' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'HR Director at TechCorp',
      text: 'Airswift transformed our hiring process. We found the perfect candidates in half the time.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'CEO at StartupHub',
      text: 'The AI ranking system is incredibly accurate. Best hiring platform investment we made.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Recruiter at Global Talents',
      text: 'The verification system gives us confidence in every candidate we present.',
      rating: 5
    }
  ];

  return (
    <div className={styles.homepage}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logo}>
            ✈️ AIRSWIFT
          </Link>
          
          <div className={styles.navLinks}>
            <Link href="#features" className={styles.navLink}>Features</Link>
            <Link href="#how-it-works" className={styles.navLink}>How It Works</Link>
            <Link href="#pricing" className={styles.navLink}>Pricing</Link>
            <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
            <Link href="/login" className={`${styles.navLink} ${styles.btnGetStarted}`}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Build Your Vision.<br />
              <span className={styles.highlight}>We Make It Happen</span>
            </h1>
            
            <p className={styles.heroSubtitle}>
              Connect with top talent through AI-powered matching and streamlined hiring workflows. 
              Find your dream team faster than ever before.
            </p>

            <div className={styles.heroCTA}>
              <Link href="/register" className={styles.btnPrimary}>
                Get Started Free <FiArrowRight />
              </Link>
              <Link href="#how-it-works" className={styles.btnSecondary}>
                Learn More
              </Link>
            </div>

            {/* Email Signup */}
            <div className={styles.emailSignup}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.emailInput}
              />
              <button className={styles.emailBtn}>Subscribe</button>
            </div>
          </div>

          <div className={styles.heroImage}>
            <div className={styles.imagePlaceholder}>
              💼 Workspace Setup
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className={styles.stats}>
        <div className={styles.statsContainer}>
          {stats.map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>
            Why More Than a Digital Solution
          </h2>
          
          <p className={styles.sectionSubtitle}>
            Airswift combines cutting-edge AI technology with human expertise to deliver exceptional hiring outcomes
          </p>

          <div className={styles.featuresGrid}>
            {features.map((feature, idx) => (
              <div key={idx} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>How It Works</h2>

          <div className={styles.stepsContainer}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Create Your Profile</h3>
              <p>Sign up and build your profile with job preferences and skills</p>
            </div>

            <div className={styles.stepArrow}>→</div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Get Matched</h3>
              <p>Our AI algorithm matches you with perfect job opportunities</p>
            </div>

            <div className={styles.stepArrow}>→</div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Apply & Interview</h3>
              <p>Apply with one click and schedule interviews instantly</p>
            </div>

            <div className={styles.stepArrow}>→</div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Get Hired</h3>
              <p>Receive offers and start your new adventure</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>What Our Clients Say</h2>

          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className={styles.testimonialCard}>
                <div className={styles.stars}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FiStar key={i} className={styles.star} />
                  ))}
                </div>
                
                <p className={styles.testimonialText}>"{testimonial.text}"</p>
                
                <div className={styles.testimonialAuthor}>
                  <div className={styles.authorAvatar}>
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <h4 className={styles.authorName}>{testimonial.name}</h4>
                    <p className={styles.authorRole}>{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>Ready to Transform Your Hiring?</h2>
          <p className={styles.ctaSubtitle}>
            Join hundreds of companies already using Airswift to find top talent
          </p>
          
          <div className={styles.ctaButtons}>
            <Link href="/register" className={styles.btnPrimary}>
              Start Free Trial <FiArrowRight />
            </Link>
            <button className={styles.btnContact}>Schedule Demo</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h3 className={styles.footerTitle}>✈️ AIRSWIFT</h3>
              <p>Connecting talent with opportunity through AI-powered hiring.</p>
            </div>

            <div className={styles.footerSection}>
              <h4>Product</h4>
              <ul>
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="#security">Security</Link></li>
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h4>Company</h4>
              <ul>
                <li><Link href="#about">About</Link></li>
                <li><Link href="#blog">Blog</Link></li>
                <li><Link href="#careers">Careers</Link></li>
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h4>Legal</h4>
              <ul>
                <li><Link href="#privacy">Privacy</Link></li>
                <li><Link href="#terms">Terms</Link></li>
                <li><Link href="#contact">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>&copy; 2026 Airswift. All rights reserved.</p>
            <div className={styles.socialLinks}>
              <a href="#twitter" aria-label="Twitter">𝕏</a>
              <a href="#linkedin" aria-label="LinkedIn">in</a>
              <a href="#github" aria-label="GitHub">gh</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
