import type { ReactNode } from 'react';

export function FeatureHeading({ tag, title, description, action }: { tag: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-head"><div><p className="eyebrow">{tag}</p><h1>{title}</h1>{description && <p className="subtitle">{description}</p>}</div>{action}</div>;
}
export function FeatureEmpty({ title, description = '', action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}
