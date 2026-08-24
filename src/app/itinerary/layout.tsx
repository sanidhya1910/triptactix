import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI planner',
  description: 'Generate a day-by-day itinerary with real flight prices, stays and per-activity costs.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
