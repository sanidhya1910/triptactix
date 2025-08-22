import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  currentPage?: string;
  showGetStarted?: boolean;
}

export function Navbar({ currentPage, showGetStarted = true }: NavbarProps) {
  const navItems = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/search', label: 'Search', key: 'search' },
    { href: '/itinerary', label: 'AI Planner', key: 'itinerary' },
    { href: '/ml-dashboard', label: 'ML Analytics', key: 'ml-dashboard' },
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 supports-[backdrop-filter]:bg-white/25 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="Triptactix Logo"
              width={32}
              height={32}
              className="w-8 h-8"
              priority
            />
            <span className="text-2xl font-bold text-black">
              Triptactix
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`transition-colors ${
                  currentPage === item.key
                    ? 'text-black font-semibold'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {showGetStarted && (
              <Button asChild>
                <Link href="/search">
                  Get Started
                </Link>
              </Button>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              Menu
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
