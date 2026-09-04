'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Home, Globe, Plus, Search } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const openUploadModal = useUIStore((s) => s.openUploadModal)

  // Hide on study sessions to avoid distraction
  if (pathname.startsWith('/study')) {
    return null
  }

  return (
    <nav
      id="mobile-bottom-navbar"
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#12151c]/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-[var(--color-border)] py-2 px-3 flex items-center justify-around z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pb-safe"
    >
      {/* Tab 1: Library */}
      <button
        onClick={() => router.push('/')}
        className={`flex flex-col items-center gap-1 transition-colors w-14 ${
          pathname === '/'
            ? 'text-[#0057ff] dark:text-[var(--color-accent)] font-semibold'
            : 'text-slate-400 hover:text-slate-600 dark:text-[var(--color-text-muted)] dark:hover:text-[var(--color-text-primary)]'
        }`}
      >
        <Home className="w-5 h-5" strokeWidth={pathname === '/' ? 2.4 : 2} />
        <span className="text-[10px] font-medium leading-none">Library</span>
      </button>

      {/* Tab 2: Feed */}
      <button
        onClick={() => router.push('/feed')}
        className={`flex flex-col items-center gap-1 transition-colors w-14 ${
          pathname === '/feed'
            ? 'text-[#0057ff] dark:text-[var(--color-accent)] font-semibold'
            : 'text-slate-400 hover:text-slate-600 dark:text-[var(--color-text-muted)] dark:hover:text-[var(--color-text-primary)]'
        }`}
      >
        <Globe className="w-5 h-5" strokeWidth={pathname === '/feed' ? 2.4 : 2} />
        <span className="text-[10px] font-medium leading-none">Feed</span>
      </button>

      {/* Center Floating Action Button: Create Deck / Scanner */}
      <div className="relative flex justify-center w-14">
        <button
          onClick={() => openUploadModal()}
          aria-label="Create Deck"
          className="-mt-7 w-12 h-12 rounded-full bg-gradient-to-tr from-[#0052cc] to-[#2575fc] text-white flex items-center justify-center ring-4 ring-white dark:ring-[#12151c] shadow-[0_8px_20px_rgba(0,82,204,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6 text-white stroke-[2.8]" />
        </button>
      </div>

      {/* Tab 4: Search */}
      <button
        onClick={() => router.push('/search')}
        className={`flex flex-col items-center gap-1 transition-colors w-14 ${
          pathname === '/search'
            ? 'text-[#0057ff] dark:text-[var(--color-accent)] font-semibold'
            : 'text-slate-400 hover:text-slate-600 dark:text-[var(--color-text-muted)] dark:hover:text-[var(--color-text-primary)]'
        }`}
      >
        <Search className="w-5 h-5" strokeWidth={pathname === '/search' ? 2.4 : 2} />
        <span className="text-[10px] font-medium leading-none">Search</span>
      </button>
    </nav>
  )
}
