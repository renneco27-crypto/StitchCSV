'use client'

import { create } from 'zustand'

type UploadTab = 'file' | 'text' | 'notes'

interface UIState {
  isUploadModalOpen: boolean
  uploadModalTab: UploadTab
}

interface UIActions {
  openUploadModal: (tab?: UploadTab) => void
  closeUploadModal: () => void
  setUploadModalTab: (tab: UploadTab) => void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  isUploadModalOpen: false,
  uploadModalTab: 'text',

  openUploadModal: (tab = 'file') =>
    set({ isUploadModalOpen: true, uploadModalTab: tab }),

  closeUploadModal: () => set({ isUploadModalOpen: false }),

  setUploadModalTab: (tab) => set({ uploadModalTab: tab }),
}))