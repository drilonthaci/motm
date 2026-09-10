export const route = $state({ path: location.hash.slice(1) || '/' });

export function go(path) {
  location.hash = path;
}

window.addEventListener('hashchange', () => {
  route.path = location.hash.slice(1) || '/';
  window.scrollTo(0, 0);
});
