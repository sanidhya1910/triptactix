import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My trips',
  description: 'Saved itineraries, price alerts and recent searches, stored on this device.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
