interface TrueFalseCardProps {
  statement: string
  chapter: string
  subject: string
}

export default function TrueFalseCard({ statement, chapter, subject }: TrueFalseCardProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-8">
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <span>{chapter}</span>
        <span>·</span>
        <span>{subject}</span>
      </div>
      <p className="font-['DM_Serif_Display'] text-2xl md:text-3xl text-center min-h-[120px] flex items-center justify-center text-[var(--color-text-primary)] mt-4">
        {statement}
      </p>
    </div>
  )
}
