'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Globe, Plus, Menu, X, ChevronDown, ChevronRight, FileText, User, Search } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import { useUIStore } from '@/store/uiStore'
import { useCreditsStore } from '@/store/creditsStore'
import { Coins, PlaySquare } from 'lucide-react'
import { getDeckBlanks, DeckBlank } from '@/features/blanks/deckBlanksApi'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'My Library', icon: Home, href: '/' },
  { label: 'Public Feed', icon: Globe, href: '/feed' },
  { label: 'Search', icon: Search, href: '/search' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const openUploadModal = useUIStore((s) => s.openUploadModal)
  const { credits, isPaidAccount, addCreditsFromAd, setPaidAccount } = useCreditsStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [blanksDropdownOpen, setBlanksDropdownOpen] = useState(false)
  const [savedBlanks, setSavedBlanks] = useState<DeckBlank[]>([])

  const deckMatch = pathname.match(/^\/study\/([^/]+)/)
  const currentDeckId = deckMatch ? deckMatch[1] : null

  useEffect(() => {
    async function loadBlanks() {
      if (!currentDeckId) {
        setSavedBlanks([])
        return
      }
      const blanks = await getDeckBlanks(currentDeckId)
      setSavedBlanks(blanks)
    }
    loadBlanks()

    const handleUpdate = () => loadBlanks()
    window.addEventListener('blanks-updated', handleUpdate)
    return () => window.removeEventListener('blanks-updated', handleUpdate)
  }, [currentDeckId])

  const NavContent = () => (
    <>
      <div className="px-5 py-5 hidden lg:block border-b border-slate-200">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 w-full squishy-btn text-left"
          title="StudyUp"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0052cc] to-[#003bb3] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-950 leading-tight">
              StudyUp
            </span>
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              Campus IT
            </span>
          </div>
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1.5 px-3 pt-5">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                active
                  ? 'bg-blue-100/90 text-[#0047b3] border border-blue-200 shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <item.icon size={18} className={`shrink-0 ${active ? 'text-[#0052cc]' : 'text-slate-500'}`} />
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
          className="mt-4 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#0052cc] hover:bg-[#0047b3] text-white text-sm font-black shadow-md transition-all squishy-btn cursor-pointer"
        >
          <Plus size={18} className="shrink-0 stroke-[2.5]" />
          <span>Create Deck</span>
        </button>

        {/* Saved Blanks Dropdown */}
        {savedBlanks.length > 0 && (
          <div className="mt-4 flex flex-col gap-1">
            <button
              onClick={() => setBlanksDropdownOpen(!blanksDropdownOpen)}
              className="flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="shrink-0 text-[var(--color-accent)]" />
                <span>Saved Blanks</span>
              </div>
              {blanksDropdownOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {blanksDropdownOpen && (
              <div className="flex flex-col gap-1 pl-4 pr-2 border-l-2 border-[var(--color-border)] ml-4 mt-1">
                {savedBlanks.map(blank => (
                  <button
                    key={blank.id}
                    onClick={() => {
                      router.push(`/study/${blank.deck_id}/blanks?blankId=${blank.id}`)
                      setIsMobileOpen(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors text-left truncate"
                    title={blank.title}
                  >
                    <span className="truncate">{blank.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 
        <div className="mt-8 px-4">
          <div className="bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] p-4 flex flex-col items-center text-center">
            <div className="bg-[var(--color-accent)]/20 p-2 rounded-full mb-2">
              <Coins size={24} className="text-[var(--color-accent)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {isPaidAccount ? 'Unlimited Access' : `${credits} Credits`}
            </p>
            {!isPaidAccount && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-3">
                Watch an ad to earn more credits for AI Generation!
              </p>
            )}
            {!isPaidAccount ? (
              <button
                onClick={() => {
                  // Simulate watching an ad
                  alert('Watching an Ad...')
                  setTimeout(() => {
                    addCreditsFromAd()
                    alert('You earned 10 credits!')
                  }, 2000)
                }}
                className="w-full flex justify-center items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-know)]/20 text-[var(--color-know)] text-xs font-semibold hover:bg-[var(--color-know)]/30 transition-colors"
              >
                <PlaySquare size={14} />
                Watch Ad
              </button>
            ) : (
              <p className="text-xs text-[var(--color-know)] font-semibold mt-2">Premium Active</p>
            )}
            
            <button
              onClick={() => setPaidAccount(!isPaidAccount)}
              className="mt-3 text-[10px] text-[var(--color-text-muted)] underline opacity-50 hover:opacity-100"
            >
              Toggle Paid Account (Dev)
            </button>
          </div>
        </div>
        */}
      </nav>

      <div className="p-4 border-t border-[var(--color-border)]">
        <SignOutButton className="w-full justify-start" />
      </div>
    </>
  )

  const isStudyOrSearch = pathname.startsWith('/study') || pathname === '/search'

  return (
    <>
      {/* Mobile Top Bar - Only on top-level navigation pages */}
      {!isStudyOrSearch && (
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 squishy-btn"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0052cc] to-[#2575fc] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              S
            </div>
            <span className="text-base font-bold text-slate-800">
              Study<span className="text-[#0052cc]">Up</span>
            </span>
          </button>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -mr-2 text-slate-600 hover:text-slate-900 transition-colors squishy-btn"
          >
            <Menu size={24} />
          </button>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-2xl flex flex-col transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-base font-bold text-slate-800">
            Navigation Menu
          </span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors squishy-btn"
          >
            <X size={20} />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 h-screen sticky top-0 border-r border-slate-200 bg-white flex-col z-30">
        <NavContent />
      </aside>
    </>
  )
}