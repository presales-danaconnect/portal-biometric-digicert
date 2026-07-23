import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n';

export function ProductLanding() {
  const { t } = useTranslation();
  const [scanProgress, setScanProgress] = useState(0);

  const SERVICES = [
    {
      tab: t('landing.service1Tab'),
      name: t('landing.service1Name'),
      desc: t('landing.service1Desc'),
      engine: t('landing.service1Engine'),
      url: '/verify?service=ocr&tenant=demo',
    },
    {
      tab: t('landing.service2Tab'),
      name: t('landing.service2Name'),
      desc: t('landing.service2Desc'),
      engine: t('landing.service2Engine'),
      url: '/verify?service=liveness&tenant=demo',
    },
    {
      tab: t('landing.service3Tab'),
      name: t('landing.service3Name'),
      desc: t('landing.service3Desc'),
      engine: t('landing.service3Engine'),
      url: '/verify?service=compare-faces&tenant=demo',
    },
    {
      tab: t('landing.service4Tab'),
      name: t('landing.service4Name'),
      desc: t('landing.service4Desc'),
      engine: t('landing.service4Engine'),
      url: '/verify?service=data-verification&tenant=demo&docRef=1148214469',
    },
  ];

  const SECURITY_POINTS = [
    { label: t('landing.securityTransportLabel'), detail: t('landing.securityTransportDetail') },
    { label: t('landing.securityAuthLabel'), detail: t('landing.securityAuthDetail') },
    { label: t('landing.securityIsolationLabel'), detail: t('landing.securityIsolationDetail') },
    { label: t('landing.securityTenantLabel'), detail: t('landing.securityTenantDetail') },
  ];

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 2600;

    const animate = (now: number) => {
      const elapsed = (now - start) % duration;
      setScanProgress(elapsed / duration);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);


  return (
    <div className="pl-root">
      <style>{`
        .pl-root a {
          text-decoration: none;
          color: inherit;
        }
        .pl-root {
          --orange: #e64a24;
          --orange-dark: #c73d1b;
          --maroon: #8b2e1f;
          --navy: #1b3a5c;
          --bg: #ffffff;
          --surface: #faf7f5;
          --border: #ece4e0;
          --text: #1f2430;
          --text-dim: #6b7280;
          --display: 'Poppins', 'Inter', sans-serif;
          --body: 'Inter', -apple-system, sans-serif;
          --mono: 'JetBrains Mono', 'SF Mono', monospace;

          background: var(--bg);
          color: var(--text);
          font-family: var(--body);
          min-height: 100vh;
          line-height: 1.55;
        }

        @media (prefers-reduced-motion: reduce) {
          .pl-scanline, .pl-scan-glow { animation: none !important; }
        }

        .pl-shell {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .pl-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 0;
        }
        .pl-brand {
          font-family: var(--display);
          font-weight: 700;
          font-size: 19px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
        }
        .pl-brand-mark {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(135deg, var(--navy), var(--orange));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
        }
        .pl-nav-links {
          display: flex;
          gap: 28px;
          align-items: center;
        }
        .pl-nav-links a {
          color: var(--text-dim);
          text-decoration: none;
          font-size: 14.5px;
          font-weight: 500;
        }
        .pl-nav-cta {
          background: var(--orange);
          color: #fff !important;
          padding: 10px 20px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 14px;
        }

        .pl-hero {
          background: linear-gradient(135deg, var(--orange), var(--orange-dark));
          border-radius: 0 0 28px 28px;
          padding: 56px 0 64px;
          text-align: center;
          color: #fff;
        }
        .pl-hero-inner { padding: 0 24px; }
        .pl-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 22px;
        }
        .pl-tag b { color: #ffd23f; }
        .pl-h1 {
          font-family: var(--display);
          font-weight: 800;
          font-size: clamp(34px, 6vw, 58px);
          letter-spacing: -0.01em;
          line-height: 1.08;
          margin: 0 0 18px;
          text-transform: uppercase;
        }
        .pl-sub {
          color: rgba(255,255,255,0.92);
          font-size: 17px;
          max-width: 560px;
          margin: 0 auto 36px;
        }

        .pl-mock {
          max-width: 560px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 24px 50px rgba(0,0,0,0.25);
          text-align: left;
        }
        .pl-mock-bar { display: flex; gap: 6px; margin-bottom: 14px; }
        .pl-mock-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border); }
        .pl-mock-card {
          position: relative;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          gap: 16px;
          align-items: center;
          overflow: hidden;
        }
        .pl-mock-avatar {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .pl-mock-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .pl-mock-line { height: 8px; border-radius: 4px; background: var(--surface); }
        .pl-mock-line.w70 { width: 70%; }
        .pl-mock-line.w45 { width: 45%; }
        .pl-mock-line.w60 { width: 60%; }
        .pl-scanline {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--orange);
          box-shadow: 0 0 12px 1px var(--orange);
          animation: scan-move 2.6s ease-in-out infinite;
        }
        .pl-scan-glow {
          position: absolute;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(180deg, rgba(230,74,36,0.15), transparent);
          animation: scan-move 2.6s ease-in-out infinite;
        }
        @keyframes scan-move {
          0% { top: 0%; }
          50% { top: 92%; }
          100% { top: 0%; }
        }
        .pl-mock-check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--orange);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pl-hero-ctas {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 32px;
        }
        .pl-btn-light, .pl-btn-outline {
          font-family: var(--body);
          font-weight: 600;
          font-size: 15px;
          padding: 13px 26px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-block;
        }
        .pl-btn-light { background: #fff; color: var(--orange-dark); }
        .pl-btn-outline { border: 1.5px solid rgba(255,255,255,0.7); color: #fff; }

        .pl-tabs {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 40px;
          padding: 0 24px;
        }
        .pl-tab {
          font-family: var(--body);
          font-weight: 600;
          font-size: 13.5px;
          padding: 12px 20px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          background: var(--maroon);
          color: rgba(255,255,255,0.85);
        }
        .pl-tab.is-active { background: #fff; color: var(--orange-dark); }

        .pl-section { padding: 64px 0; border-top: 1px solid var(--border); }
        .pl-kicker {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--navy);
          font-weight: 700;
          margin-bottom: 12px;
        }
        .pl-h2 {
          font-family: var(--display);
          font-weight: 700;
          font-size: clamp(24px, 3.6vw, 34px);
          letter-spacing: -0.01em;
          margin: 0 0 16px;
          max-width: 640px;
        }
        .pl-p { color: var(--text-dim); font-size: 16px; max-width: 620px; margin: 0; }

        .pl-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
        @media (max-width: 720px) { .pl-split { grid-template-columns: 1fr; } }
        .pl-split-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 28px; }
        .pl-split-card h3 { font-family: var(--display); font-size: 18px; margin: 0 0 12px; font-weight: 700; }
        .pl-split-card.is-problem h3 { color: var(--text-dim); }
        .pl-split-card.is-solution { background: #fff5f2; border-color: #f3d8cd; }
        .pl-split-card.is-solution h3 { color: var(--orange-dark); }
        .pl-split-card p { color: var(--text-dim); font-size: 15px; margin: 0; }
        .pl-embed-url {
          font-family: var(--mono);
          font-size: 12.5px;
          color: var(--navy);
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          margin-top: 14px;
          word-break: break-all;
        }

        .pl-service-list {
          margin-top: 36px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 720px) {
          .pl-service-list { grid-template-columns: 1fr; }
        }
        .pl-service-detail {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 28px;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .pl-service-detail:hover {
          border-color: var(--orange);
          transform: translateY(-2px);
        }
        .pl-service-detail h3 { font-family: var(--display); font-weight: 700; font-size: 19px; margin: 0 0 10px; color: var(--orange-dark); }
        .pl-service-detail p { color: var(--text-dim); font-size: 14.5px; margin: 0 0 14px; }
        .pl-service-engine {
          display: inline-block;
          font-family: var(--mono);
          font-size: 12px;
          color: var(--navy);
          background: #fff;
          border: 1px solid var(--border);
          padding: 5px 12px;
          border-radius: 999px;
        }

        .pl-arch-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 36px; }
        @media (max-width: 720px) { .pl-arch-grid { grid-template-columns: 1fr; } }
        .pl-arch-card { border: 1px solid var(--border); border-radius: 12px; padding: 22px; }
        .pl-arch-card .pl-arch-metric { font-family: var(--display); font-weight: 800; font-size: 30px; color: var(--orange); margin-bottom: 6px; }
        .pl-arch-card .pl-arch-label { font-size: 14px; color: var(--text-dim); }

        .pl-security-list { margin-top: 32px; }
        .pl-security-row { display: grid; grid-template-columns: 150px 1fr; gap: 24px; padding: 18px 0; border-top: 1px solid var(--border); }
        @media (max-width: 600px) { .pl-security-row { grid-template-columns: 1fr; gap: 6px; } }
        .pl-security-label { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--orange-dark); }
        .pl-security-detail { color: var(--text-dim); font-size: 15px; }

        .pl-callout {
          border: 1px solid var(--border);
          background: linear-gradient(135deg, var(--surface), #fff);
          border-radius: 16px;
          padding: 34px;
          margin-top: 36px;
          display: flex;
          gap: 28px;
          align-items: center;
          flex-wrap: wrap;
        }
        .pl-callout-badge {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--orange-dark);
          border: 1px solid #f3d8cd;
          background: #fff5f2;
          border-radius: 999px;
          padding: 5px 12px;
          display: inline-block;
          margin-bottom: 14px;
          font-weight: 700;
        }
        .pl-callout-text h3 { font-family: var(--display); font-weight: 700; font-size: 20px; margin: 0 0 8px; }
        .pl-callout-text p { color: var(--text-dim); font-size: 15px; margin: 0; max-width: 440px; }
        .pl-callout-flow {
          font-family: var(--mono);
          font-size: 12.5px;
          color: var(--text-dim);
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 220px;
        }
        .pl-callout-flow span { color: var(--text); font-weight: 600; }

        .pl-final { text-align: center; padding: 80px 0 88px; }
        .pl-final .pl-h2 { margin: 0 auto 16px; }
        .pl-final .pl-p { margin: 0 auto 32px; }
        .pl-btn-solid {
          background: var(--orange);
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          padding: 13px 26px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-block;
        }
        .pl-btn-outline-dark {
          border: 1.5px solid var(--border);
          color: var(--text);
          font-weight: 600;
          font-size: 15px;
          padding: 13px 26px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-block;
        }
        .pl-final-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        .pl-footer {
          border-top: 1px solid var(--border);
          padding: 26px 0 44px;
          display: flex;
          justify-content: space-between;
          color: var(--text-dim);
          font-size: 13px;
          flex-wrap: wrap;
          gap: 12px;
        }
      `}</style>

      <div className="pl-shell">
        <nav className="pl-nav">
          <div className="pl-brand">
            <span className="pl-brand-mark">✓</span>
            Identity Verification SDK
          </div>
          <div className="pl-nav-links">
            <a href="#servicios">{t('landing.navServices')}</a>
            <a href="#seguridad">{t('landing.navSecurity')}</a>
            <a href="#whatsapp">{t('landing.navWhatsapp')}</a>
            <a href="/verify?service=ocr&amp;tenant=demo" className="pl-nav-cta">{t('landing.navDemo')}</a>
          </div>
        </nav>
      </div>

      <div className="pl-hero">
        <div className="pl-hero-inner">
          <div className="pl-tag">{t('landing.heroTag')} <b>{t('landing.heroTagBold')}</b></div>
          <h1 className="pl-h1">{t('landing.heroTitle1')}<br />{t('landing.heroTitle2')}</h1>
          <p className="pl-sub">{t('landing.heroSub')}</p>

          <div className="pl-mock" aria-hidden="true">
            <div className="pl-mock-bar">
              <span className="pl-mock-dot" />
              <span className="pl-mock-dot" />
              <span className="pl-mock-dot" />
            </div>
            <div className="pl-mock-card">
              <div className="pl-mock-avatar" />
              <div className="pl-mock-lines">
                <div className="pl-mock-line w70" />
                <div className="pl-mock-line w45" />
                <div className="pl-mock-line w60" />
              </div>
              <div className="pl-scan-glow" style={{ top: `${scanProgress * 92}%` }} />
              <div className="pl-scanline" style={{ top: `${scanProgress * 92}%` }} />
              <div className="pl-mock-check">✓</div>
            </div>
          </div>

          <div className="pl-tabs">
            {SERVICES.map((s) => (
              <a key={s.tab} href={s.url} target="_blank" rel="noopener noreferrer" className="pl-tab">
                {s.tab}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="pl-shell">
        <section className="pl-section" id="servicios">
          <div className="pl-kicker">{t('landing.servicesKicker')}</div>
          <h2 className="pl-h2">{t('landing.servicesTitle')}</h2>

          <div className="pl-service-list">
            {SERVICES.map((s) => (
              <a key={s.tab} href={s.url} target="_blank" rel="noopener noreferrer" className="pl-service-detail">
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
                <span className="pl-service-engine">{s.engine}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="pl-section">
          <div className="pl-kicker">{t('landing.problemKicker')}</div>
          <h2 className="pl-h2">{t('landing.problemTitle')}</h2>
          <div className="pl-split">
            <div className="pl-split-card is-problem">
              <h3>{t('landing.problemWithoutTitle')}</h3>
              <p>{t('landing.problemWithoutDesc')}</p>
            </div>
            <div className="pl-split-card is-solution">
              <h3>{t('landing.problemWithTitle')}</h3>
              <p>{t('landing.problemWithDesc')}</p>
              <div className="pl-embed-url">tudominio.com/verify?service=ocr&amp;tenant=1</div>
            </div>
          </div>
        </section>

        <section className="pl-section">
          <div className="pl-kicker">{t('landing.archKicker')}</div>
          <h2 className="pl-h2">{t('landing.archTitle')}</h2>
          <div className="pl-arch-grid">
            <div className="pl-arch-card">
              <div className="pl-arch-metric">100%</div>
              <div className="pl-arch-label">{t('landing.archMetric1Label')}</div>
            </div>
            <div className="pl-arch-card">
              <div className="pl-arch-metric">4</div>
              <div className="pl-arch-label">{t('landing.archMetric2Label')}</div>
            </div>
            <div className="pl-arch-card">
              <div className="pl-arch-metric">0</div>
              <div className="pl-arch-label">{t('landing.archMetric3Label')}</div>
            </div>
          </div>
        </section>
        <section className="pl-section" id="seguridad">
          <div className="pl-kicker">{t('landing.securityKicker')}</div>
          <h2 className="pl-h2">{t('landing.securityTitle')}</h2>
          <div className="pl-security-list">
            {SECURITY_POINTS.map((s) => (
              <div className="pl-security-row" key={s.label}>
                <div className="pl-security-label">{s.label}</div>
                <div className="pl-security-detail">{s.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="pl-section" id="whatsapp">
          <div className="pl-kicker">{t('landing.whatsappKicker')}</div>
          <h2 className="pl-h2">{t('landing.whatsappTitle')}</h2>
          <div className="pl-callout">
            <div className="pl-callout-text" style={{ flex: 2, minWidth: 240 }}>
              <span className="pl-callout-badge">{t('landing.whatsappBadge')}</span>
              <h3>{t('landing.whatsappCalloutTitle')}</h3>
              <p>{t('landing.whatsappCalloutDesc')}</p>
            </div>
            <div className="pl-callout-flow">
              <div>{t('landing.whatsappFlow1')} <span>{t('landing.whatsappFlow1Bold')}</span></div>
              <div>{t('landing.whatsappFlow2')} <span>{t('landing.whatsappFlow2Bold')}</span></div>
              <div>{t('landing.whatsappFlow3')} <span>{t('landing.whatsappFlow3Bold')}</span></div>
              <div>{t('landing.whatsappFlow4')} <span>{t('landing.whatsappFlow4Bold')}</span></div>
              <div>{t('landing.whatsappFlow5')} <span>{t('landing.whatsappFlow5Bold')}</span></div>
            </div>
          </div>
        </section>

        <section className="pl-final">
          <div className="pl-kicker" style={{ textAlign: 'center' }}>{t('landing.finalKicker')}</div>
          <h2 className="pl-h2">{t('landing.finalTitle')}</h2>
          <p className="pl-p">{t('landing.finalSub')}</p>
          <div className="pl-final-ctas">
            {SERVICES.map((s, i) => (
              <a
                key={s.tab}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={i === 0 ? 'pl-btn-solid' : 'pl-btn-outline-dark'}
              >
                {t('landing.finalBtnPrefix')} {s.tab}
              </a>
            ))}
          </div>
        </section>

        <footer className="pl-footer">
          <span>© {new Date().getFullYear()} Identity Verification SDK</span>
          <span>{t('landing.footerPowered')}</span>
        </footer>
      </div>
    </div>
  );
}
