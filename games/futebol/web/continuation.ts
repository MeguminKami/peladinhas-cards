// Shared by keyboard, presentations and automatic scheduling. No queued key presses.
let blockedUntil=0;
let spinBlockedUntil=0;
export function lockContinuation(){blockedUntil=Math.max(blockedUntil,performance.now()+500);}
export function continuationDelay(){return Math.max(0,blockedUntil-performance.now());}
export async function waitForContinuation(){const delay=continuationDelay();if(delay>0)await new Promise<void>(resolve=>setTimeout(resolve,Math.ceil(delay)));}

export function installSpaceContinuation(action:()=>null|(()=>void)){
 let held=false,consumed=false;
 const down=(event:KeyboardEvent)=>{
  if(event.code!=='Space'||event.altKey||event.ctrlKey||event.metaKey)return;
  const target=event.target as HTMLElement|null;
  if(target?.closest('input,select,textarea,[contenteditable="true"]'))return;
  const next=action();
  if(!next&&!consumed)return;
  event.preventDefault();event.stopImmediatePropagation();consumed=true;
  if(held||event.repeat)return;held=true;
  const screen=!!document.querySelector('dialog[open]');
  if(screen?continuationDelay()>0:performance.now()<spinBlockedUntil)return;
  spinBlockedUntil=performance.now()+100;
  if(screen)lockContinuation();next?.();
 };
 const up=(event:KeyboardEvent)=>{if(event.code!=='Space')return;held=false;if(consumed){event.preventDefault();event.stopImmediatePropagation();}consumed=false;};
 document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);
 window.addEventListener('blur',()=>{held=false;consumed=false;});
 // A click followed immediately by Space must not leak into the next screen.
 document.addEventListener('click',event=>{const target=event.target as HTMLElement|null;if(target?.closest('#enter-bonus,#continue-retrigger,#summary-done,.win-celebration,.retrigger-celebration'))lockContinuation();},true);
}
