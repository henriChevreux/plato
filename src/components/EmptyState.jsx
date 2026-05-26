export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      {icon && <div className="text-4xl text-muted">{icon}</div>}
      <div>
        <p className="text-text font-medium">{title}</p>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
