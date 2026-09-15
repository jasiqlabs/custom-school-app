import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 50% 10%, #f0fdf4 0%, #f8fafc 45%, #f1f5f9 100%)' }}>
      {/* Top Navigation */}
      <header style={{ borderBottom: '1px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/assets/images/get-digital-your-school.png"
              alt="Get Digital Your School"
              style={{ height: 42, width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                GET DIGITAL YOUR SCHOOL
              </div>
              <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, letterSpacing: '0.04em' }}>
                School ERP Software
              </div>
            </div>
          </div>
          <div className="badge-pill" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12, padding: '6px 14px' }}>
            <span style={{ fontSize: 14 }}>🛡️</span>
            <span>Secure &bull; Scalable &bull; Reliable</span>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 840, margin: '0 auto 40px auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            <span>Platform Branding</span>
            <span>&bull;</span>
            <span>School Management Made Simple</span>
          </div>

          <div style={{ margin: '0 auto 20px auto', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/assets/images/get-digital-your-school.png"
              alt="Get Digital Your School - School ERP Software"
              style={{ maxHeight: 110, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 12px 0' }}>
            GET DIGITAL YOUR SCHOOL
          </h1>
          <div style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: 600, color: '#0284c7', marginBottom: 16 }}>
            School ERP Software
          </div>
          <p className="muted" style={{ fontSize: 'clamp(14px, 1.8vw, 16px)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
            Secure, multi-tenant school operations, student records, fee collection, and administrative infrastructure designed for modern academic institutions.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 340px))', gap: 24, width: '100%', maxWidth: 740, justifyContent: 'center' }}>
          {/* Admin Portal Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 18,
              }}
            >
              👤
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Platform Admin Panel
            </h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 24px 0', flex: 1 }}>
              Manage schools, administrative users, global settings, and platform operations.
            </p>
            <Link
              href="/admin/login"
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                padding: '12px 20px',
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              <span>Access Admin Panel</span>
              <span style={{ fontSize: 16 }}>&rarr;</span>
            </Link>
          </div>

          {/* School Operator Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 18,
              }}
            >
              🏫
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              School Operator Panel
            </h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 24px 0', flex: 1 }}>
              Manage students, fee collection, admissions, and daily school operations.
            </p>
            <Link
              href="/operator/login"
              className="btn btn-emerald"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                padding: '12px 20px',
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              <span>Access Operator Panel</span>
              <span style={{ fontSize: 16 }}>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 48, color: '#64748b', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            GET DIGITAL YOUR SCHOOL &bull; School ERP Software
          </div>
          <div>One Platform. Brighter Futures.</div>
        </div>
      </main>
    </div>
  );
}
