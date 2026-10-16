import { createRoot } from 'react-dom/client';
import { Application } from './app/Application';
import { OverlaysProvider } from './shared/overlays';
import { prepareDevelopment } from './development';

const root = document.getElementById('root');
if (!root) throw Error('Raiz da aplicação indisponível.');
if (!(await prepareDevelopment().catch(error => {console.warn('Não foi possível libertar a cache de desenvolvimento.', error); return false;}))) {
  createRoot(root).render(<OverlaysProvider><Application/></OverlaysProvider>);
}
