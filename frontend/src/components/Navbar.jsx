import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar({ user, setUser }) {
  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Easy Blog
        </Link>
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/create" className="navbar-link">写文章</Link>
              <span className="navbar-user">你好，{user.username}</span>
              <button onClick={handleLogout} className="navbar-btn logout-btn">退出</button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">登录</Link>
              <Link to="/register" className="navbar-link">注册</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
