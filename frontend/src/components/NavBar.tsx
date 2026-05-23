import { useNavigate, useLocation } from 'react-router-dom'

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const links = [
    { label: 'My Blog', path: '/blog' },
    { label: 'Saved Posts', path: '/' },
  ]

  return (
    <nav style={{
      height: 52, borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 0, boxShadow: '0 1px 0 var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <span
        onClick={() => navigate('/')}
        style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', cursor: 'pointer', marginRight: 32, letterSpacing: '-0.5px' }}
      >
        Smart Blog
      </span>

      <div style={{ display: 'flex', gap: 4 }}>
        {links.map(({ label, path }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 0,
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
