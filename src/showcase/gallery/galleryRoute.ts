/**
 * The gallery's URL hash, so a link can open one story: `#/<id>` is its
 * details, `#/<id>/play` its live demo, `#/about` the about panel. Anything
 * else, an unknown story included, is home.
 */
export type GalleryRoute =
  | { view: 'home' }
  | { view: 'about' }
  | { view: 'story'; id: string; tab: 'details' | 'demo' };

/** Reads a `location.hash`; `isStory` says which ids name a story. */
export function parseRoute(hash: string, isStory: (id: string) => boolean): GalleryRoute {
  const [head, tail, ...rest] = hash.replace(/^#\/?/, '').split('/');
  if (head === 'about' && tail === undefined) return { view: 'about' };
  if (!head || !isStory(head) || rest.length) return { view: 'home' };
  if (tail === undefined) return { view: 'story', id: head, tab: 'details' };
  if (tail === 'play') return { view: 'story', id: head, tab: 'demo' };
  return { view: 'home' };
}

/** The hash that `parseRoute` reads back as `route`. */
export function formatRoute(route: GalleryRoute): string {
  if (route.view === 'home') return '#/';
  if (route.view === 'about') return '#/about';
  return route.tab === 'demo' ? `#/${route.id}/play` : `#/${route.id}`;
}
