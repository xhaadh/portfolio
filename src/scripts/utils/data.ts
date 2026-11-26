/** Client-side project data, embedded as JSON by Base.astro. */
export interface ClientProject {
  slug: string;
  index: number;
  title: string;
  titleMixedCase: string;
  color: string;
  textColor: string;
  cover: string;
  images: string[];
  completed: string;
  type: string;
  role: string;
  description: string;
}

let cache: ClientProject[] | null = null;

export function getProjects(): ClientProject[] {
  if (cache) return cache;
  const el = document.getElementById('projects-data');
  cache = el ? (JSON.parse(el.textContent || '[]') as ClientProject[]) : [];
  cache.sort((a, b) => a.index - b.index);
  return cache;
}

export const projectBySlug = (slug: string | null | undefined) => getProjects().find((p) => p.slug === slug);

export type PageName = 'home' | 'project' | 'about';

/** Normalised pathname: "/meridian" and "/meridian/" both -> "/meridian/" */
export const normPath = (p: string) => (p.endsWith('/') ? p : `${p}/`);

/** Which page a URL points to (used before the new page's DOM exists). */
export function pageFromPath(pathname: string): { page: PageName; slug?: string } {
  const p = normPath(pathname);
  if (p === '/') return { page: 'home' };
  if (p === '/about/') return { page: 'about' };
  const slug = p.split('/').filter(Boolean)[0];
  return projectBySlug(slug) ? { page: 'project', slug } : { page: 'home' };
}

/** Page of the current document (from <html data-page>). */
export function currentPage(): { page: PageName; slug?: string } {
  const html = document.documentElement;
  return { page: (html.dataset.page as PageName) || 'home', slug: html.dataset.slug || undefined };
}
