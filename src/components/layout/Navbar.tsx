'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  currentPage?: string;
  showGetStarted?: boolean;
}

const navItems = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/search', label: 'Search', key: 'search' },
  { href: '/itinerary', label: 'AI Planner', key: 'itinerary' },
  { href: '/trips', label: 'My Trips', key: 'trips' },
  { href: '/ml-dashboard', label: 'ML Analytics', key: 'ml-dashboard' },
];

export function Navbar({ currentPage, showGetStarted = true }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur-xl border-b border-neutral-200/80 shadow-sm">
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
            <span className="text-2xl font-bold text-black">Triptactix</span>
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
                <Link href="/search">Get Started</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  currentPage === item.key
                    ? 'bg-neutral-100 text-black font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {showGetStarted && (
              <Button asChild className="w-full mt-2">
                <Link href="/search" onClick={() => setMobileOpen(false)}>
                  Get Started
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
