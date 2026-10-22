// Shared page identifiers. The active page is mirrored into the URL hash
// (#/modules, #/tutorials …) so every page is linkable and survives reloads.
export type Page =
  | 'home'
  | 'deepdives'
  | 'modules'
  | 'tutorials'
  | 'course'
  | 'questions'
  | 'docs'
  | 'glossary';

export const PAGES: { page: Page; label: string }[] = [
  { page: 'home', label: 'Architecture' },
  { page: 'deepdives', label: 'Deep Dives' },
  { page: 'modules', label: 'Modules' },
  { page: 'tutorials', label: 'Tutorials' },
  { page: 'course', label: 'Course' },
  { page: 'questions', label: 'Questions' },
  { page: 'docs', label: 'Docs' },
  { page: 'glossary', label: 'Glossary' },
];

export function pageFromHash(hash: string): Page {
  const id = hash.replace(/^#\/?/, '').split('/')[0] as Page;
  return PAGES.some(p => p.page === id) ? id : 'home';
}
