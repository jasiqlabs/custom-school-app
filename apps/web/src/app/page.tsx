import Link from 'next/link';
import styles from './home.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <img
              className={styles.headerLogo}
              src="/assets/images/get-digital-your-school.png"
              alt="Get Digital Your School logo"
            />
            <div className={styles.brandCopy}>
              <div className={styles.brandName}>GET DIGITAL YOUR SCHOOL</div>
              <div className={styles.brandSubtitle}>School ERP Software</div>
            </div>
          </div>
          <div className={styles.trustBadge}>
            <span aria-hidden="true">🛡️</span>
            <span>Secure &bull; Scalable &bull; Reliable</span>
          </div>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.eyebrow}>
            <span>Platform Branding</span>
            <span aria-hidden="true">&bull;</span>
            <span>School Management Made Simple</span>
          </div>

          <img
            className={styles.heroLogo}
            src="/assets/images/get-digital-your-school.png"
            alt=""
            aria-hidden="true"
          />
          <h1 id="home-title" className={styles.title}>GET DIGITAL YOUR SCHOOL</h1>
          <p className={styles.heroSubtitle}>School ERP Software</p>
          <p className={styles.description}>
            Secure, multi-tenant school operations, student records, fee collection, and administrative infrastructure designed for modern academic institutions.
          </p>
        </section>

        <section className={styles.portals} aria-label="Choose your portal">
          <article className={styles.portalCard}>
            <div className={`${styles.portalIcon} ${styles.adminIcon}`} aria-hidden="true">👤</div>
            <h2 className={styles.portalTitle}>Platform Admin Panel</h2>
            <p className={styles.portalDescription}>
              Manage schools, administrative users, global settings, and platform operations.
            </p>
            <Link href="/admin/login" className={`${styles.portalLink} ${styles.adminLink}`}>
              <span>Access Admin Panel</span>
              <span className={styles.linkArrow} aria-hidden="true">&rarr;</span>
            </Link>
          </article>

          <article className={styles.portalCard}>
            <div className={`${styles.portalIcon} ${styles.operatorIcon}`} aria-hidden="true">🏫</div>
            <h2 className={styles.portalTitle}>School Operator Panel</h2>
            <p className={styles.portalDescription}>
              Manage students, fee collection, admissions, and daily school operations.
            </p>
            <Link href="/operator/login" className={`${styles.portalLink} ${styles.operatorLink}`}>
              <span>Access Operator Panel</span>
              <span className={styles.linkArrow} aria-hidden="true">&rarr;</span>
            </Link>
          </article>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            GET DIGITAL YOUR SCHOOL &bull; School ERP Software
          </div>
          <div>One Platform. Brighter Futures.</div>
        </footer>
      </main>
    </div>
  );
}
