import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search flights',
  description: 'Compare live flight, train and hotel prices, with model-backed fare predictions on six Indian metro routes.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
