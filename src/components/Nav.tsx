import './Nav.css';

type Page = 'home' | 'course' | 'glossary' | 'docs';

interface Props {
  page: Page;
  setPage: (p: Page) => void;
}

export default function Nav({ page, setPage }: Props) {
  return (
    <nav className="nav">
      <div className="nav__inner">
        <button className="nav__brand" onClick={() => setPage('home')}>
          <span className="nav__brand-icon">🍰</span>
          <span className="nav__brand-text">CREAM-PIE</span>
        </button>

        <div className="nav__links">
          <NavLink active={page === 'home'}     onClick={() => setPage('home')}>
            Architecture
          </NavLink>
          <NavLink active={page === 'course'}   onClick={() => setPage('course')}>
            Course
          </NavLink>
          <NavLink active={page === 'docs'}     onClick={() => setPage('docs')}>
            Documentation
          </NavLink>
          <NavLink active={page === 'glossary'} onClick={() => setPage('glossary')}>
            Glossary
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`nav__link ${active ? 'nav__link--active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
