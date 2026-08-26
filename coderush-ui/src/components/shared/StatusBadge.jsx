const styles = {
  pending: 'bg-white/10 text-white/60',
  matched: 'bg-routine/20 text-routine',
  en_route: 'bg-elevated/20 text-elevated',
  fulfilled: 'bg-idle/20 text-idle',
  unfulfillable: 'bg-urgent/20 text-urgent',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${styles[status] || styles.pending}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
