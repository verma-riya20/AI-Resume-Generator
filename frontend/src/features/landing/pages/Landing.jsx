import React, { useState } from 'react'
import { Link } from 'react-router'
import '../styles/landing.scss'
import { useAuth } from '../../auth/hooks/useAuth'

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, handleLogout } = useAuth()
  const isAuthenticated = Boolean(user || localStorage.getItem('authToken'))

  const onLogout = async () => {
    await handleLogout()
    setMenuOpen(false)
  }

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          AceMatchAI
        </Link>

        <button
          type="button"
          className={menuOpen ? 'menu-toggle open' : 'menu-toggle'}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button type="button" className="nav-cta" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="nav-cta" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-shell">
          <div className="hero-copy">
            <p className="tag">AI-Powered Career Advantage</p>
            <h1>
              Master Your Next
              <span>Interview</span>
              with AI Intelligence
            </h1>
            <p className="subtext">
              AceMatch AI is not just a tool. It is your unfair advantage. Master the art of the
              interview with high-stakes intelligence engineered to secure your dream offer.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="primary-btn">Get Started for Free</Link>
            </div>

            <div className="hero-meta">
              <span className="verified-pill">Verified Skills</span>
            </div>

            <div className="score-chip">
              <p>Match Score</p>
              <strong>94%</strong>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="orb-wrap">
              <span className="orb" />
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Precision-Engineered Prep</h2>
        <p>Designed for high-stakes execution where every detail matters.</p>

        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">a</span>
            <h3>Resume Generation</h3>
            <p>Our AI-powered resume builder tailors your profile for ATS filters and recruiter authority.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">b</span>
            <h3>JD-Resume Analysis</h3>
            <p>Instantly analyze your resume against specific job descriptions for alignment and optimization.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">c</span>
            <h3>Skill Gap Overview</h3>
            <p>Identify missing links in your expertise and receive a timeline to bridge the gap before day one.</p>
          </article>
        </div>
      </section>

      <section className="analytics">
        <p className="eyebrow">Actionable Analytics</p>
        <h2>Quantify Your Interview Readiness</h2>
        <p className="analytics-copy">
          Stop guessing. Our dashboard provides a real-time visualization of your strengths and
          weaknesses across technical and behavioral question sets.
        </p>

        <ul className="analytics-list">
          <li>Deep-dive performance metrics</li>
          <li>Benchmarking against role standards</li>
          <li>Targeted question bank suggestions</li>
        </ul>

        <div className="readiness-grid">
          <article className="readiness-card">
            <div className="readiness-head">
              <h3>Technical Proficiency</h3>
              <span>Excellent</span>
            </div>
            <div className="readiness-foot">
              <small>System Architecture</small>
              <strong>88% Ready</strong>
            </div>
          </article>

          <article className="readiness-card">
            <div className="readiness-head">
              <h3>Behavioral Edge</h3>
              <span>Peak</span>
            </div>
            <div className="readiness-foot">
              <small>Leadership Scenarios</small>
              <strong>72% Ready</strong>
            </div>
          </article>
        </div>

        <p className="insight-pill">AI Insight: Refine your "Why us?" response.</p>
      </section>

      <section className="cta-block">
        <h2>Join the Future of Job Hunting</h2>
        <p>
          Elevate your career trajectory with the intelligence of a digital mentor.
          Your next big role is one prep session away.
        </p>
        <Link to="/register" className="primary-btn">Create Free Profile</Link>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">AceMatch AI</div>
        <div className="footer-links">
          <span>Analytics</span>
          <span>Resume</span>
          <span>Gap</span>
          <span>Privacy</span>
        </div>
        <p>© 2024 AceMatch AI. High-Stakes Career</p>
      </footer>
    </main>
  )
}

export default Landing
