const frame = document.querySelector('iframe');
let observer;
function fitWidget() {
  observer?.disconnect();
  const shell = frame.contentDocument?.querySelector('.shell');
  if (!shell) return;
  observer = new ResizeObserver(() => {
    if (!frame.contentDocument.fullscreenElement) {
      frame.style.height = `${Math.ceil(shell.getBoundingClientRect().height)}px`;
    }
  });
  observer.observe(shell);
  observer.observe(frame.contentDocument.body);
}
frame.addEventListener('load', fitWidget);
if (frame.contentDocument?.readyState === 'complete') fitWidget();
