export default function OnlineStatusDot({ isOnline, className = '' }) {
  return (
    <span
      className={`rounded-full ${
        isOnline
          ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]'
          : 'bg-[#849585]'
      } ${className}`}
      title={isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
      aria-label={isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
    />
  )
}
