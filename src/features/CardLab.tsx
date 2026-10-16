import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cardLab } from '../../js/card-lab.js';
import { Empty } from '../shared/ui';
import { toast } from '../shared/overlays';
import type { PageContext } from '../types';
import { AdminMenu } from '../app/Chrome';

/**
 * Specialized authoring boundary: the established pointer-driven Card Lab owns
 * this empty host's descendants. React owns navigation, permissions and lifetime.
 * Keeping its editor engine preserves project import/export, history, pointer
 * geometry and the exact CSS card composition during the application migration.
 */
export function CardLab({ctx, uid}: {ctx: PageContext; uid?: string}) {
  const host = useRef<HTMLDivElement>(null);
  const [menuRoot,setMenuRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (ctx.user.role !== 'admin') return;
    let active = true;
    const disposers: (() => void | Promise<void>)[] = [];
    const editor = {
      ...ctx,
      render(markup: string) {
        if (!active || !host.current) throw Object.assign(Error('Navigation superseded'), {code:'navigation-cancelled'});
        host.current.innerHTML = markup;
      },
      cleanup(dispose: () => void | Promise<void>) {if(active) disposers.push(dispose); else void dispose();},
    };
    void cardLab(editor,uid).then(() => {
      if (!active || !host.current) return;
      const mount = document.createElement('div');
      mount.style.display = 'contents';
      host.current.querySelector('.page-head')?.after(mount);
      setMenuRoot(mount);
      document.title = 'Card Lab · Peladinhas Cards';
    }).catch((error: unknown) => {if(active) toast(error instanceof Error ? error.message : String(error),'error');});
    return () => {active = false; for (const dispose of disposers) void dispose();};
  }, [ctx,uid]);
  if (ctx.user.role !== 'admin') return <Empty title="Acesso reservado" description="O Card Lab está disponível para ADMIN." symbol="shield"/>;
  return <><div ref={host} data-card-lab-boundary style={{display:'contents'}}/>{menuRoot && createPortal(<AdminMenu/>,menuRoot)}</>;
}
