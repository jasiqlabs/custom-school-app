import Link from 'next/link';

export default function Home() {
  return (
    <div className="landing-root">
      {/* Decorative Background Artwork matching reference design */}
      <div className="bg-canvas" aria-hidden="true">
        {/* Soft elegant side waves matching reference image */}
        <svg
          className="bg-wave-left"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 240C120 220 220 320 340 380C420 420 470 480 500 500H0V240Z"
            fill="url(#wave-left-grad)"
          />
          <defs>
            <linearGradient id="wave-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2eefc" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#ebf4fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f4f8fe" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        <svg
          className="bg-wave-right"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M500 240C380 220 280 320 160 380C80 420 30 480 0 500H500V240Z"
            fill="url(#wave-right-grad)"
          />
          <defs>
            <linearGradient id="wave-right-grad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2eefc" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#ebf4fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f4f8fe" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Left Side: Graduation Cap Doodle */}
        <div className="doodle doodle-cap">
          <svg width="84" height="84" viewBox="0 0 80 80" fill="none" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M40 16L10 32L40 48L70 32L40 16Z" />
            <path d="M22 39V54C22 54 28 62 40 62C52 62 58 54 58 54V39" />
            <path d="M70 32V52" />
            <circle cx="70" cy="54" r="2.5" fill="#93c5fd" />
          </svg>
        </div>

        {/* Left Side: Open Book Doodle */}
        <div className="doodle doodle-book">
          <svg width="78" height="78" viewBox="0 0 80 80" fill="none" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M40 58C32 52 20 52 12 55V20C20 18 32 18 40 24C48 18 60 18 68 20V55C60 52 48 52 40 58Z" />
            <path d="M40 24V58" />
            <path d="M18 28C24 27 32 28 36 30" strokeWidth="1.2" />
            <path d="M18 36C24 35 32 36 36 38" strokeWidth="1.2" />
            <path d="M44 30C48 28 56 27 62 28" strokeWidth="1.2" />
            <path d="M44 38C48 36 56 35 62 36" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Left Side: Dot Grid */}
        <div className="doodle doodle-dots-left">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="#bfdbfe">
            <circle cx="6" cy="6" r="2" />
            <circle cx="22" cy="6" r="2" />
            <circle cx="38" cy="6" r="2" />
            <circle cx="54" cy="6" r="2" />
            <circle cx="6" cy="22" r="2" />
            <circle cx="22" cy="22" r="2" />
            <circle cx="38" cy="22" r="2" />
            <circle cx="54" cy="22" r="2" />
            <circle cx="6" cy="38" r="2" />
            <circle cx="22" cy="38" r="2" />
            <circle cx="38" cy="38" r="2" />
            <circle cx="54" cy="38" r="2" />
            <circle cx="6" cy="54" r="2" />
            <circle cx="22" cy="54" r="2" />
            <circle cx="38" cy="54" r="2" />
            <circle cx="54" cy="54" r="2" />
          </svg>
        </div>

        {/* Right Side: Document Sheet Doodle */}
        <div className="doodle doodle-doc">
          <svg width="74" height="88" viewBox="0 0 70 82" fill="none" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="12" y="10" width="46" height="62" rx="7" />
            <line x1="22" y1="26" x2="48" y2="26" strokeWidth="2" />
            <line x1="22" y1="36" x2="48" y2="36" strokeWidth="2" />
            <line x1="22" y1="46" x2="48" y2="46" strokeWidth="2" />
            <line x1="22" y1="56" x2="38" y2="56" strokeWidth="2" />
          </svg>
        </div>

        {/* Right Side: Student Avatars Doodle */}
        <div className="doodle doodle-group">
          <svg width="86" height="74" viewBox="0 0 86 74" fill="none" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="43" cy="24" r="9" />
            <path d="M28 50C28 41.7 34.7 35 43 35C51.3 35 58 41.7 58 50" />
            <circle cx="21" cy="28" r="6.5" />
            <path d="M10 50C10 43.9 14.9 39 21 39C24 39 26.6 40.2 28.5 42" />
            <circle cx="65" cy="28" r="6.5" />
            <path d="M76 50C76 43.9 71.1 39 65 39C62 39 59.4 40.2 57.5 42" />
          </svg>
        </div>

        {/* Right Side: Dot Grid */}
        <div className="doodle doodle-dots-right">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="#bfdbfe">
            <circle cx="6" cy="6" r="2" />
            <circle cx="22" cy="6" r="2" />
            <circle cx="38" cy="6" r="2" />
            <circle cx="54" cy="6" r="2" />
            <circle cx="6" cy="22" r="2" />
            <circle cx="22" cy="22" r="2" />
            <circle cx="38" cy="22" r="2" />
            <circle cx="54" cy="22" r="2" />
            <circle cx="6" cy="38" r="2" />
            <circle cx="22" cy="38" r="2" />
            <circle cx="38" cy="38" r="2" />
            <circle cx="54" cy="38" r="2" />
            <circle cx="6" cy="54" r="2" />
            <circle cx="22" cy="54" r="2" />
            <circle cx="38" cy="54" r="2" />
            <circle cx="54" cy="54" r="2" />
          </svg>
        </div>
      </div>

      {/* Top Header Navigation */}
      <header className="landing-header">
        <div className="header-inner">
          {/* Logo Branding */}
          <div className="brand-group">
            <img
              src="/assets/images/get-your-school-log.png"
              alt="Get Digital Your School Logo"
              className="brand-logo-img"
            />
            <div className="brand-text">
              <span className="brand-title">GET DIGITAL YOUR SCHOOL</span>
              <span className="brand-sub">School ERP Software</span>
            </div>
          </div>

          {/* Secure Badge Pill */}
          <div className="security-pill">
            <svg
              className="shield-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="pill-label">Secure &bull; Scalable &bull; Reliable</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <div className="hero-content">
          <h1 className="hero-heading">GET DIGITAL YOUR SCHOOL</h1>
          <h2 className="hero-subheading">School ERP Software</h2>
          <p className="hero-text">
            Secure, multi-tenant school operations, student records, fee collection, and administrative infrastructure designed for modern academic institutions.
          </p>

          {/* The Single Prominent Card: "Manage Your School" */}
          <div className="portal-card">
            {/* School Building Illustration Badge */}
            <div className="card-icon-container">
              <svg
                width="46"
                height="46"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="school-illustration"
                aria-hidden="true"
              >
                {/* School Building Base Walls */}
                <rect x="14" y="27" width="36" height="27" rx="2" fill="#fed7aa" />
                <rect x="23" y="19" width="18" height="35" rx="2" fill="#fbbf24" />

                {/* Main Roof */}
                <path d="M12 28L23 20V28H12Z" fill="#f97316" />
                <path d="M52 28L41 20V28H52Z" fill="#f97316" />

                {/* Center Belfry / Tower Roof */}
                <path d="M20 20L32 9L44 20H20Z" fill="#ea580c" />

                {/* Flagpole & Flag */}
                <line x1="32" y1="9" x2="32" y2="2" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M32 2.5L40 5.5L32 8.5V2.5Z" fill="#0284c7" />

                {/* Clock / Bell Opening */}
                <circle cx="32" cy="15" r="3" fill="#ffffff" />
                <circle cx="32" cy="15" r="1" fill="#ea580c" />

                {/* Windows Upper Row */}
                <rect x="17" y="32" width="6" height="6" rx="1" fill="#38bdf8" />
                <rect x="41" y="32" width="6" height="6" rx="1" fill="#38bdf8" />

                {/* Windows Lower Row */}
                <rect x="17" y="42" width="6" height="6" rx="1" fill="#38bdf8" />
                <rect x="41" y="42" width="6" height="6" rx="1" fill="#38bdf8" />

                {/* Entrance Doorway with Arch */}
                <path d="M28 54V43C28 40.8 29.8 39 32 39C34.2 39 36 40.8 36 43V54H28Z" fill="#0f766e" />
                <rect x="27" y="53" width="10" height="2" rx="0.5" fill="#cbd5e1" />
              </svg>
            </div>

            {/* Card Titles */}
            <h3 className="card-title">Manage Your School</h3>
            <p className="card-description">
              Manage students, fee collection, admissions, and daily school operations.
            </p>

            {/* Primary Action Button */}
            <Link
              href="/operator/login"
              className="portal-action-btn"
              id="btn-manage-your-school"
            >
              <span>Manage Your School</span>
              <span className="arrow-icon" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="landing-footer">
        <div className="footer-inner">
          {/* Centered Brand Tagline & Copyright */}
          <div className="footer-center" style={{ width: '100%' }}>
            <div className="footer-brand-text">
              GET DIGITAL YOUR SCHOOL &bull; School ERP Software
            </div>
            <div className="footer-tagline">
              One Platform. Brighter Futures.
            </div>
          </div>
        </div>
      </footer>

      {/* Embedded Component Styles */}
      <style>{`
        .landing-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          position: relative;
          background: linear-gradient(180deg, #f7faff 0%, #f1f7fc 45%, #e9f2fa 100%);
          color: #0f172a;
          overflow-x: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Responsive Background Canvas */
        .bg-canvas {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .bg-wave-left {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 48vw;
          height: 38vh;
          min-width: 320px;
          min-height: 220px;
          pointer-events: none;
        }

        .bg-wave-right {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 48vw;
          height: 38vh;
          min-width: 320px;
          min-height: 220px;
          pointer-events: none;
        }

        .doodle {
          position: absolute;
          pointer-events: none;
          opacity: 0.38;
          transition: opacity 0.3s ease;
        }

        .doodle-cap {
          top: 18%;
          left: 8%;
          transform: rotate(-10deg);
        }

        .doodle-book {
          top: 48%;
          left: 14%;
          transform: rotate(5deg);
        }

        .doodle-dots-left {
          top: 35%;
          left: 4%;
          opacity: 0.28;
        }

        .doodle-doc {
          top: 20%;
          right: 12%;
          transform: rotate(8deg);
        }

        .doodle-group {
          top: 48%;
          right: 15%;
          transform: rotate(-4deg);
        }

        .doodle-dots-right {
          top: 32%;
          right: 4%;
          opacity: 0.28;
        }

        /* Top Header */
        .landing-header {
          position: relative;
          z-index: 20;
          width: 100%;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.6);
        }

        .header-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 12px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          min-width: 0;
        }

        .brand-logo-img {
          height: 40px;
          width: auto;
          object-fit: contain;
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.18;
          min-width: 0;
        }

        .brand-title {
          font-weight: 800;
          font-size: 15px;
          color: #0f172a;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .brand-sub {
          font-size: 11.5px;
          color: #0284c7;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        /* Pill Badge */
        .security-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.04);
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .shield-icon {
          width: 15px;
          height: 15px;
          color: #0284c7;
          flex-shrink: 0;
        }

        /* Main Hero Section */
        .landing-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 10;
          padding: 36px 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .hero-content {
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .hero-heading {
          font-size: clamp(28px, 4.4vw, 44px);
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.15;
          margin: 0 0 6px 0;
        }

        .hero-subheading {
          font-size: clamp(18px, 2.6vw, 26px);
          font-weight: 700;
          color: #0284c7;
          letter-spacing: -0.01em;
          margin: 0 0 16px 0;
        }

        .hero-text {
          font-size: clamp(14px, 1.6vw, 15.5px);
          color: #475569;
          line-height: 1.6;
          max-width: 660px;
          margin: 0 auto 34px auto;
        }

        /* Single Prominent Portal Card */
        .portal-card {
          width: 100%;
          max-width: 380px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 24px;
          padding: 34px 30px 30px 30px;
          box-shadow: 0 20px 40px -15px rgba(30, 58, 138, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .portal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 24px 48px -12px rgba(30, 58, 138, 0.12), 0 4px 10px rgba(15, 23, 42, 0.04);
        }

        .card-icon-container {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: #dcfce7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 6px rgba(5, 150, 105, 0.08);
        }

        .school-illustration {
          width: 46px;
          height: 46px;
          display: block;
        }

        .card-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.015em;
          margin: 0 0 10px 0;
        }

        .card-description {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 24px 0;
          max-width: 290px;
        }

        .portal-action-btn {
          width: 100%;
          background: #059669;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          padding: 13px 20px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);
          transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
          box-sizing: border-box;
          min-height: 48px;
        }

        .portal-action-btn:hover {
          background: #047857;
          box-shadow: 0 6px 18px rgba(5, 150, 105, 0.36);
          transform: translateY(-1px);
        }

        .portal-action-btn:active {
          transform: translateY(0);
        }

        .arrow-icon {
          font-size: 17px;
          line-height: 1;
          transition: transform 0.18s ease;
        }

        .portal-action-btn:hover .arrow-icon {
          transform: translateX(3px);
        }

        /* Footer */
        .landing-footer {
          position: relative;
          z-index: 20;
          width: 100%;
          padding: 16px 0 22px 0;
        }

        .footer-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-sizing: border-box;
        }

        .footer-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          min-width: 180px;
        }

        .admin-login-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 6px;
          transition: color 0.15s ease;
          min-height: 36px;
        }

        .admin-login-link:hover {
          color: #0f172a;
        }

        .admin-shield-icon {
          width: 16px;
          height: 16px;
          color: #64748b;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .admin-login-link:hover .admin-shield-icon {
          color: #0f172a;
        }

        .footer-center {
          flex: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 3px;
        }

        .footer-brand-text {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .footer-tagline {
          font-size: 12px;
          color: #64748b;
        }

        .footer-right {
          flex: 1;
          min-width: 180px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 992px) {
          .doodle-cap { left: 4%; top: 16%; }
          .doodle-doc { right: 4%; top: 18%; }
          .doodle-book { left: 6%; }
          .doodle-group { right: 6%; }
        }

        @media (max-width: 768px) {
          .header-inner {
            padding: 10px 16px;
            gap: 8px;
          }

          .brand-title {
            font-size: 13px;
          }

          .brand-sub {
            font-size: 10.5px;
          }

          .brand-logo-img {
            height: 34px;
          }

          .security-pill {
            padding: 5px 10px;
            font-size: 11px;
            gap: 6px;
          }

          .landing-main {
            padding: 28px 16px 20px 16px;
          }

          .hero-text {
            margin-bottom: 26px;
          }

          .portal-card {
            padding: 28px 20px 24px 20px;
            max-width: 360px;
          }

          /* Footer Layout on Tablets & Mobiles */
          .footer-inner {
            padding: 0 16px;
            flex-direction: column-reverse;
            gap: 12px;
            text-align: center;
          }

          .footer-left {
            justify-content: center;
            width: 100%;
            min-width: unset;
          }

          .admin-login-link {
            min-height: 44px;
            padding: 8px 14px;
          }

          .footer-center {
            width: 100%;
          }

          .footer-right {
            display: none;
          }

          .doodle-cap, .doodle-book, .doodle-doc, .doodle-group, .doodle-dots-left, .doodle-dots-right {
            opacity: 0.16;
          }
        }

        @media (max-width: 480px) {
          .header-inner {
            padding: 8px 12px;
          }

          .brand-group {
            gap: 8px;
          }

          .brand-title {
            font-size: 11.5px;
          }

          .brand-sub {
            font-size: 9px;
          }

          .brand-logo-img {
            height: 28px;
          }

          .security-pill {
            padding: 4px 8px;
            font-size: 10px;
            gap: 4px;
          }

          .pill-label {
            font-size: 10.5px;
          }

          .hero-heading {
            font-size: 22px;
          }

          .hero-subheading {
            font-size: 16px;
          }

          .hero-text {
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 22px;
          }

          .portal-card {
            padding: 24px 16px 20px 16px;
            border-radius: 20px;
          }

          .card-title {
            font-size: 20px;
          }

          .card-description {
            font-size: 13px;
          }

          .footer-brand-text {
            font-size: 12px;
          }

          .footer-tagline {
            font-size: 11px;
          }
        }

        @media (max-width: 360px) {
          .pill-label {
            display: none;
          }
          .security-pill {
            padding: 6px;
            border-radius: 50%;
          }
        }
      `}</style>
    </div>
  );
}
