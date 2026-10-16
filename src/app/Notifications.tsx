import { createContext, useContext } from 'react';
import { NotificationsPage as Page, type NotificationProps } from '../features/notifications';
import type { Notice } from '../types';

export const NotificationState = createContext<Notice[] | null>(null);
export function NotificationsPage(props: NotificationProps) {
  const items = useContext(NotificationState);
  return <Page {...props} items={items || props.items}/>;
}
