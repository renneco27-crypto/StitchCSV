'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Home, Globe, Plus } from 'lucide-react'
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

  return (
    <aside className="w-16 lg:w-60 shrink-0 h-screen sticky top-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-xl flex flex-col">
      <div className="px-3 py-5 lg:px-5">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2.5 w-full squishy-btn"
          title="MaeAI"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center font-['Playfair_Display'] font-bold cyber-glow shrink-0">
            M
          </div>
          <span className="hidden lg:block text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
            Mae<span className="text-[var(--color-accent)]">AI</span>
          </span>
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 lg:px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={item.label}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors squishy-btn ${
                active
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] cyber-glow'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]'
              }`}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          )
        })}

        <button
          onClick={() => openUploadModal()}
          title="Create Deck"
          className="mt-4 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity squishy-btn cyber-glow-hover"
        >
          <Plus size={18} className="shrink-0" />
          <span className="hidden lg:inline">Create Deck</span>
        </button>
      </nav>

      <div className="p-2 lg:p-4 border-t border-[var(--color-border)]">
        <SignOutButton iconOnly className="w-full justify-center lg:justify-start" />
      </div>
    </aside>
  )
}