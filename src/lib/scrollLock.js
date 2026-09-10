/* Freezing the page behind a dialog. `overflow: hidden` alone is ignored by
   iOS Safari, so the body is pinned with `position: fixed` and the scroll
   offset is restored on release. Reference-counted, because more than one
   dialog can be open in a stack. */

let depth = 0;
let savedY = 0;

export function lockScroll() {
  depth += 1;
  if (depth === 1) {
    savedY = window.scrollY;
    document.body.style.top = `-${savedY}px`;
    document.body.classList.add('scroll-locked');
  }
  return () => {
    depth -= 1;
    if (depth === 0) {
      document.body.classList.remove('scroll-locked');
      document.body.style.top = '';
      window.scrollTo(0, savedY);
    }
  };
}
