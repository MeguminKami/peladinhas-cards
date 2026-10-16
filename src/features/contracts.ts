import type { ReactNode } from 'react';

export interface Timestamp { seconds: number; nanoseconds?: number }
export interface FeatureUser { uid: string; role: string }
export interface FeatureContext {
  user: FeatureUser;
  render(content: ReactNode): void;
  go(href: string): void;
  cleanup(dispose: () => void): void;
}
export interface Ticket { id: string; title: string; status: string; closedByName?: string; updatedAt?: Timestamp }
export interface TicketMessage { id: string; authorId: string; authorName: string; authorRole: string; body: string; createdAt?: Timestamp }
export interface TicketService {
  tickets(user: FeatureUser): Promise<Ticket[]>;
  read(path: string): Promise<Ticket | null>;
  callAdmin(name: string, data: Record<string, unknown>): Promise<{ data: { id: string } }>;
  watchTicket(id: string, ticket: (value: Ticket | null) => void, messages: (value: TicketMessage[]) => void, error: () => void): () => void;
}
