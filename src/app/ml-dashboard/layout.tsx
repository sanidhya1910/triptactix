import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fare data',
  description: 'Route pricing, airline share and booking-window analysis from 600,000 historical fares.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
