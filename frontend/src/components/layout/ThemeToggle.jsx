import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  );

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('zync-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('zync-theme');
    }
  };

  return { theme, toggle };
}

export default function ThemeToggle({ size = 13 }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="icon-btn"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
