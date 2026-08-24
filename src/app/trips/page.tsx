import { redirect } from 'next/navigation';

/**
 * Trips consolidated onto /dashboard. Kept as a redirect so existing links,
 * bookmarks and any indexed URL keep resolving.
 */
export default function TripsPage() {
  redirect('/dashboard');
}
