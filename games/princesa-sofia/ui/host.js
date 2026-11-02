const frame = document.querySelector('iframe');
let scheduled = 0;
function fitWidget() {
  scheduled = 0;
  if (frame.contentDocument?.fullscreenElement) return;
  const viewport = window.visualViewport;
  const visibleBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight);
  const top = frame.getBoundingClientRect().top;
  const height = Math.max(1, Math.floor(visibleBottom - Math.max(0, top) - 16));
  if (Math.abs(frame.clientHeight-height)>1) frame.style.height = `${height}px`;
}
function schedule() { if (!scheduled) scheduled=requestAnimationFrame(fitWidget); }
frame.addEventListener('load',()=>{frame.contentDocument?.addEventListener('fullscreenchange',schedule);schedule();});
addEventListener('resize',schedule);
window.visualViewport?.addEventListener('resize',schedule);
window.visualViewport?.addEventListener('scroll',schedule);
schedule();
