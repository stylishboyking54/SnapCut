import React from 'react';
import Link from 'next/link';
import { GithubIcon, TwitterIcon, InstagramIcon } from '@/components/ui/Icons';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-200 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm">© {year} SnapCut. All rights reserved.</div>
          <nav className="flex space-x-4">
            <Link href="/privacy"><a className="hover:underline">Privacy</a></Link>
            <Link href="/terms"><a className="hover:underline">Terms</a></Link>
            <Link href="/contact"><a className="hover:underline">Contact</a></Link>
          </nav>
          <div className="flex space-x-3">
            <a href="https://github.com/STYLISHBOYKING11/SnapCut" target="_blank" rel="noopener noreferrer">
              <GithubIcon size={20} color="currentColor" />
            </a>
            <a href="https://twitter.com/SnapCut" target="_blank" rel="noopener noreferrer">
              <TwitterIcon size={20} color="currentColor" />
            </a>
            <a href="https://instagram.com/SnapCut" target="_blank" rel="noopener noreferrer">
              <InstagramIcon size={20} color="currentColor" />
            </a>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">
          Made with 💈 by the SnapCut team.
        </p>
      </div>
    </footer>
  );
}
