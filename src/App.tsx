import { useState, useEffect } from 'react';
import PasswordGate from './components/PasswordGate';
import Nav from './components/Nav';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import GlossaryPage from './pages/GlossaryPage';

type Page = 'home' | 'course' | 'glossary';

const SESSION_KEY = 'sag_auth';
const CORRECT_PASSWORD = 'creampie';

export default function App() {
  const [authed, setAuthed]     = useState(false);
  const [page, setPage]         = useState<Page>('home');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setAuthed(true);
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
        {page === 'home'     && <HomePage     setPage={setPage} />}
        {page === 'course'   && <CoursePage />}
        {page === 'glossary' && <GlossaryPage />}
      </main>
    </>
  );
}
