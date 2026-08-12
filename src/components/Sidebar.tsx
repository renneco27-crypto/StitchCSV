'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Globe, Plus, Menu, X } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import { useUIStore } from '@/store/uiStore'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'My Library', icon: Home, href: '/' },
  { label: 'Public Feed', icon: Globe, href: '/feed' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const openUploadModal = useUIStore((s) => s.openUploadModal)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const NavContent = () => (
    <>
      <div className="px-5 py-5 hidden lg:block">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2.5 w-full squishy-btn"
          title="MaeAI"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center font-['Playfair_Display'] font-bold cyber-glow shrink-0">
            M
          </div>
          <span className="text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
            Mae<span className="text-[var(--color-accent)]">AI</span>
          </span>
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 pt-4 lg:pt-0">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href)
                setIsMobileOpen(false)
              }}
              title={item.label}
              className={`flex items-center gap-3 px-4 py-3 lg:py-2 rounded-xl text-base lg:text-sm font-medium transition-colors squishy-btn ${
                active
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] cyber-glow'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}

        <button
          onClick={() => {
            openUploadModal()
            setIsMobileOpen(false)
          }}
          title="Create Deck"
          className="mt-4 flex items-center gap-3 px-4 py-3 lg:py-2 rounded-xl bg-[var(--color-accent)] text-white text-base lg:text-sm font-medium hover:opacity-90 transition-opacity squishy-btn cyber-glow-hover"
        >
          <Plus size={20} className="shrink-0" />
          <span>Create Deck</span>
        </button>
      </nav>

      <div className="p-4 border-t border-[var(--color-border)]">
        <SignOutButton className="w-full justify-start" />
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 squishy-btn"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center font-['Playfair_Display'] font-bold cyber-glow">
            M
          </div>
          <span className="text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
            Mae<span className="text-[var(--color-accent)]">AI</span>
          </span>
        </button>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors squishy-btn"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[var(--color-bg)] border-r border-[var(--color-border)] shadow-2xl flex flex-col transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <span className="text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
            Menu
          </span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 -mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors squishy-btn"
          >
            <X size={20} />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen sticky top-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-xl flex-col">
        <NavContent />
      </aside>
    </>
  )
}