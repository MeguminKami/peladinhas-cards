import type { CSSProperties } from 'react';

export function cssProperties(source: string): CSSProperties {
  return Object.fromEntries(source.split(';').filter(Boolean).map(rule => {
    const i = rule.indexOf(':');
    const name = rule.slice(0, i).trim();
    return [name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), rule.slice(i + 1).trim()];
  }));
}
