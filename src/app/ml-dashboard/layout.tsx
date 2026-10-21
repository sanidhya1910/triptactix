import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fare data',
  description: 'Route pricing, airline share and booking-window patterns from 300,153 real domestic bookings.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
