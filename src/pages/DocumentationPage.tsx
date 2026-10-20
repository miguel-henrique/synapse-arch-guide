import { useMemo, useState, useEffect, useRef } from 'react';
import { DOCS } from '../data/docs';
import type { Doc } from '../data/docs';
import { Markdown } from '../components/Markdown';
import './DocumentationPage.css';

export default function DocumentationPage() {
  const [activeDocId, setActiveDocId] = useState<string>(DOCS[0].id);
  const [search, setSearch] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeDoc: Doc = useMemo(
    () => DOCS.find(d => d.id === activeDocId) ?? DOCS[0],
    [activeDocId],
  );

  // Search across all docs (title, summary, section titles & bodies)
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const hits: { doc: Doc; sectionId: string; sectionTitle: string; snippet: string }[] = [];
    for (const doc of DOCS) {
      for (const sec of doc.sections) {
        const hay = (sec.title + ' ' + sec.body).toLowerCase();
        if (hay.includes(q) || doc.title.toLowerCase().includes(q)) {
          const idx = sec.body.toLowerCase().indexOf(q);
          let snippet = sec.body.replace(/[`#*>|]/g, '').replace(/\s+/g, ' ').trim();
          if (idx >= 0) {
            const start = Math.max(0, idx - 60);
            snippet = (start > 0 ? '…' : '') + snippet.slice(start, start + 160) + '…';
          } else {
            snippet = snippet.slice(0, 160) + '…';
          }
          hits.push({ doc, sectionId: sec.id, sectionTitle: sec.title, snippet });
        }
      }
    }
    return hits;
  }, [search]);

  // Scroll to top of content when switching docs
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeDocId]);

  function openSection(docId: string, sectionId: string) {
    setActiveDocId(docId);
    setSearch('');
    setNavOpen(false);
    // Wait a tick for the doc to render, then scroll to the anchor
    setTimeout(() => {
      const el = document.getElementById(`sec-${sectionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  return (
    <div className="docs">
      {/* ── Mobile top bar ── */}
      <div className="docs__mobilebar">
        <button className="docs__menu-btn" onClick={() => setNavOpen(o => !o)}>
          <span className="docs__menu-icon">{navOpen ? '✕' : '☰'}</span>
          <span>{navOpen ? 'Close' : 'Documents'}</span>
        </button>
        <span className="docs__mobilebar-title">
          <span className="docs__mobilebar-icon">{activeDoc.icon}</span>
          {activeDoc.short}
        </span>
      </div>

      <div className="docs__layout">
        {/* ── Sidebar ── */}
        <aside className={`docs__sidebar ${navOpen ? 'docs__sidebar--open' : ''}`}>
          <div className="docs__sidebar-inner">
            <div className="docs__search-wrap">
              <input
                type="search"
                className="docs__search"
                placeholder="Search all docs…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <nav className="docs__nav">
              {DOCS.map((doc, i) => {
                const isActive = doc.id === activeDocId && !search;
                return (
                  <div key={doc.id} className="docs__nav-group">
                    <button
                      className={`docs__nav-doc ${isActive ? 'docs__nav-doc--active' : ''}`}
                      style={{ '--doc-color': doc.color } as React.CSSProperties}
                      onClick={() => {
                        setActiveDocId(doc.id);
                        setSearch('');
                        setNavOpen(false);
                      }}
                    >
                      <span className="docs__nav-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="docs__nav-icon">{doc.icon}</span>
                      <span className="docs__nav-doc-title">{doc.short}</span>
                    </button>

                    {isActive && (
                      <div className="docs__nav-sections">
                        {doc.sections.map(sec => (
                          <button
                            key={sec.id}
                            className="docs__nav-sec"
                            onClick={() => openSection(doc.id, sec.id)}
                          >
                            {sec.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {navOpen && <div className="docs__backdrop" onClick={() => setNavOpen(false)} />}

        {/* ── Content ── */}
        <main className="docs__content" ref={contentRef}>
          {search && results ? (
            <SearchResults results={results} query={search} onOpen={openSection} />
          ) : (
            <article className="docs__article">
              <header
                className="docs__article-header"
                style={{ '--doc-color': activeDoc.color } as React.CSSProperties}
              >
                <div className="docs__article-eyebrow">
                  <span className="docs__article-icon">{activeDoc.icon}</span>
                  <span className="docs__article-source">{activeDoc.source}</span>
                </div>
                <h1 className="docs__article-title">{activeDoc.title}</h1>
                <p className="docs__article-summary">{activeDoc.summary}</p>
              </header>

              {activeDoc.sections.map(sec => (
                <section
                  key={sec.id}
                  id={`sec-${sec.id}`}
                  className="docs__section"
                  style={{ '--doc-color': activeDoc.color } as React.CSSProperties}
                >
                  <h2 className="docs__section-title">{sec.title}</h2>
                  <div className="docs__section-body">
                    <Markdown source={sec.body} />
                  </div>
                </section>
              ))}

              <DocFooter activeDoc={activeDoc} onNav={setActiveDocId} />
            </article>
          )}
        </main>
      </div>
    </div>
  );
}

function SearchResults({
  results,
  query,
  onOpen,
}: {
  results: { doc: Doc; sectionId: string; sectionTitle: string; snippet: string }[];
  query: string;
  onOpen: (docId: string, sectionId: string) => void;
}) {
  return (
    <div className="docs__results">
      <div className="docs__results-head">
        <span className="docs__results-count">{results.length}</span> result
        {results.length === 1 ? '' : 's'} for "{query}"
      </div>
      {results.length === 0 && (
        <div className="docs__results-empty">
          Nothing matched. Try a shorter or different term.
        </div>
      )}
      <div className="docs__results-list">
        {results.map((r, i) => (
          <button
            key={i}
            className="docs__result card"
            style={{ '--doc-color': r.doc.color } as React.CSSProperties}
            onClick={() => onOpen(r.doc.id, r.sectionId)}
          >
            <div className="docs__result-top">
              <span className="docs__result-doc">
                {r.doc.icon} {r.doc.short}
              </span>
              <span className="docs__result-sec">{r.sectionTitle}</span>
            </div>
            <p className="docs__result-snippet">{r.snippet}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocFooter({ activeDoc, onNav }: { activeDoc: Doc; onNav: (id: string) => void }) {
  const idx = DOCS.findIndex(d => d.id === activeDoc.id);
  const prev = idx > 0 ? DOCS[idx - 1] : null;
  const next = idx < DOCS.length - 1 ? DOCS[idx + 1] : null;

  return (
    <nav className="docs__footer">
      {prev ? (
        <button
          className="docs__footer-btn docs__footer-btn--prev"
          onClick={() => onNav(prev.id)}
        >
          <span className="docs__footer-dir">← Previous</span>
          <span className="docs__footer-title">
            {prev.icon} {prev.title}
          </span>
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          className="docs__footer-btn docs__footer-btn--next"
          onClick={() => onNav(next.id)}
        >
          <span className="docs__footer-dir">Next →</span>
          <span className="docs__footer-title">
            {next.icon} {next.title}
          </span>
        </button>
      ) : (
        <span />
      )}
    </nav>
  );
}
