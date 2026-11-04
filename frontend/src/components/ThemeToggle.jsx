import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'

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
      {isDark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{isDark ? 'Tối' : 'Sáng'}</span>
    </button>
  )
}
