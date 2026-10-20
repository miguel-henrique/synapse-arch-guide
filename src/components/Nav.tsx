import { useState, useEffect } from 'react';
import './Nav.css';

type Page = 'home' | 'course' | 'glossary' | 'docs';

interface Props {
  page: Page;
  setPage: (p: Page) => void;
}

const LINKS: { page: Page; label: string }[] = [
  { page: 'home', label: 'Architecture' },
  { page: 'course', label: 'Course' },
  { page: 'docs', label: 'Documentation' },
  { page: 'glossary', label: 'Glossary' },
];

export default function Nav({ page, setPage }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function go(p: Page) {
    setPage(p);
    setMenuOpen(false);
  }

  return (
    <nav className="nav">
      <div className="nav__inner">
        <button className="nav__brand" onClick={() => go('home')}>
          <span className="nav__brand-icon">🍰</span>
          <span className="nav__brand-text">CREAM-PIE</span>
        </button>

        {/* Desktop links */}
        <div className="nav__links">
          {LINKS.map(l => (
            <NavLink key={l.page} active={page === l.page} onClick={() => go(l.page)}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav__burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className={`nav__burger-box ${menuOpen ? 'nav__burger-box--open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* Off-canvas drawer (right side) */}
      <div
        className={`nav__backdrop ${menuOpen ? 'nav__backdrop--open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`nav__drawer ${menuOpen ? 'nav__drawer--open' : ''}`}>
        <div className="nav__drawer-head">
          <span className="nav__drawer-title">Menu</span>
          <button
            className="nav__drawer-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="nav__drawer-links">
          {LINKS.map(l => (
            <button
              key={l.page}
              className={`nav__drawer-link ${page === l.page ? 'nav__drawer-link--active' : ''}`}
              onClick={() => go(l.page)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </aside>
    </nav>
  );
}

function NavLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`nav__link ${active ? 'nav__link--active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}
