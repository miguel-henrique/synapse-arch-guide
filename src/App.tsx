import { useState, useEffect, useCallback } from 'react';
import PasswordGate from './components/PasswordGate';
import Nav from './components/Nav';
import HomePage from './pages/HomePage';
import FitsTogetherPage from './pages/FitsTogetherPage';
import CoursePage from './pages/CoursePage';
import GlossaryPage from './pages/GlossaryPage';
import DocumentationPage from './pages/DocumentationPage';
import DeepDivesPage from './pages/DeepDivesPage';
import ModulesPage from './pages/ModulesPage';
import ShowcasePage from './pages/ShowcasePage';
import TutorialsPage from './pages/TutorialsPage';
import QuestionsPage from './pages/QuestionsPage';
import { type Page, pageFromHash } from './types';

const SESSION_KEY = 'sag_auth';
const CORRECT_PASSWORD = 'creampie';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPageState] = useState<Page>(() => pageFromHash(window.location.hash));

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setAuthed(true);
  }, []);

  // Keep the page in sync with the URL hash (back/forward buttons, shared links)
  useEffect(() => {
    const onHash = () => setPageState(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setPage = useCallback((p: Page) => {
    setPageState(p);
    const next = p === 'home' ? '#/' : `#/${p}`;
    if (window.location.hash !== next) window.location.hash = next;
    window.scrollTo({ top: 0 });
  }, []);

  function handleAuth(pw: string) {
    if (pw.toLowerCase().trim() === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
      return true;
    }
    return false;
  }

  if (!authed) return <PasswordGate onAuth={handleAuth} />;

  return (
    <>
      <Nav page={page} setPage={setPage} />
      <main>
        {page === 'home'      && <HomePage      setPage={setPage} />}
        {page === 'howitfits' && <FitsTogetherPage setPage={setPage} />}
        {page === 'deepdives' && <DeepDivesPage setPage={setPage} />}
        {page === 'modules'   && <ModulesPage   setPage={setPage} />}
        {page === 'showcase'  && <ShowcasePage  setPage={setPage} />}
        {page === 'tutorials' && <TutorialsPage setPage={setPage} />}
        {page === 'course'    && <CoursePage />}
        {page === 'questions' && <QuestionsPage />}
        {page === 'docs'      && <DocumentationPage />}
        {page === 'glossary'  && <GlossaryPage />}
      </main>
    </>
  );
}
