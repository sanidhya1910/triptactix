import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI itinerary',
  description: 'An AI-built, day-by-day itinerary with every activity, meal and stay costed.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
