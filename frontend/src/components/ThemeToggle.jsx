import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Chuyển sang giao diện ${isDark ? 'sáng' : 'tối'}`}
      aria-pressed={isDark}
      title={`Giao diện ${isDark ? 'tối' : 'sáng'}`}
    >
      <span aria-hidden="true">{isDark ? '☾' : '☀'}</span>
      <span>{isDark ? 'Tối' : 'Sáng'}</span>
    </button>
  )
}
