import { createElement, type ReactNode, type CSSProperties } from 'react';
import { icon } from '../../js/icons.js';

/** The existing icon catalogue remains the single source for SVG path data. */
export function Icon({name, className = ''}: {name: string; className?: string}) {
  const markup = icon(name);
  const d = /<path d="([^"]*)"/.exec(markup)?.[1] || '';
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;
}
export function TrendArrow({delta}: {delta: number}) {
  return <svg className={`trend-arrow${delta < 0 ? ' trend-arrow-down' : ''}`} viewBox="0 0 16 20" fill="none" aria-hidden="true" focusable="false"><path className="trend-arrow-body" d="M8 1.5 14.5 8H10v9.5H6V8H1.5L8 1.5Z"/><path className="trend-arrow-facet" d="M8 1.5V17.5H6V8H1.5L8 1.5Z"/><path className="trend-arrow-edge" d="m2 7.5 6-6 6 6"/></svg>;
}
export function Empty({title, description = '', action, symbol = 'ball'}: {title: string; description?: string; action?: ReactNode; symbol?: string}) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={symbol}/></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function PageHead({tag, title, description, action}: {tag: string; title: string; description?: string; action?: ReactNode}) {
  return <div className="page-head"><div><p className="eyebrow">{tag}</p><h1>{title}</h1>{description && <p className="subtitle">{description}</p>}</div>{action}</div>;
}
export function LinkButton({href, children, type = 'primary', symbol = 'arrow'}: {href: string; children: ReactNode; type?: string; symbol?: string}) {
  return <a className={`btn btn-${type}`} href={href}><Icon name={symbol}/>{children}</a>;
}
export function Skeleton() {
  return <div role="status"><span className="visually-hidden">A carregar a tua liga…</span><div aria-hidden="true"><div className="skeleton-head skeleton"/><div className="skeleton-grid">{[0,1,2].map(key => <div key={key} className="skeleton skeleton-panel"/>)}</div></div></div>;
}

/** Only authored SVG artwork is parsed here; app markup and events use JSX. */
export function StaticSvg({markup}: {markup: string}) {
  const fragment = !/^\s*<svg(?:\s|>)/.test(markup);
  const document = new DOMParser().parseFromString(fragment ? `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>` : markup, 'image/svg+xml');
  const convert = (node: Node, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    if (['script', 'foreignObject'].includes(node.localName)) return null;
    const props: Record<string, unknown> = {key};
    for (const attribute of node.attributes) {
      if (/^on/i.test(attribute.name)) continue;
      const name = attribute.name === 'class' ? 'className' : /^(aria-|data-)/.test(attribute.name) ? attribute.name : attribute.name.replace(/[-:]([a-z])/g, (_, c: string) => c.toUpperCase());
      if (name === 'style') {
        props.style = Object.fromEntries(attribute.value.split(';').filter(Boolean).map(declaration => {
          const separator = declaration.indexOf(':');
          return [declaration.slice(0, separator).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), declaration.slice(separator + 1).trim()];
        })) as CSSProperties;
      } else props[name] = attribute.value;
    }
    return createElement(node.localName, props, ...Array.from(node.childNodes, convert));
  };
  return fragment ? Array.from(document.documentElement.childNodes, convert) : convert(document.documentElement, 0);
}
