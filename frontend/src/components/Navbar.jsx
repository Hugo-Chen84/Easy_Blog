import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Navbar.css'

function Navbar({ user, setUser }) {
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    if (setUser) setUser(null)
    setMobileMenuOpen(false)
  }

  // 触发文件选择（桌面端和移动端通用）
  const triggerAvatarUpload = () => {
    fileInputRef.current?.click()
  }

  // 处理头像文件上传
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setShowAvatarMenu(false)

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/auth/upload-avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const updatedUser = {
        ...user,
        avatar: res.data.avatar
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      if (setUser) setUser(updatedUser)
      alert('头像更新成功')
    } catch (err) {
      console.error('Upload error:', err)
      alert('头像上传失败: ' + (err.response?.data?.message || err.message))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getDefaultAvatar = (username) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Easy Blog
        </Link>

        {/* GitHub 图标链接 */}
        <a
          className="github-link"
          href="https://github.com/Hugo-Chen84/Easy_Blog"
          target="_blank"
          rel="noopener noreferrer"
          title="查看 GitHub 仓库"
          aria-label="GitHub 仓库"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.19-3.07-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.17a11.02 11.02 0 0 1 5.79 0c2.21-1.48 3.18-1.17 3.18-1.17.63 1.59.23 2.77.12 3.06.74.8 1.19 1.82 1.19 3.07 0 4.41-2.68 5.38-5.24 5.67.41.35.78 1.04.78 2.11 0 1.52-.01 2.75-.01 3.12 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
          </svg>
        </a>

        {/* 桌面端菜单 */}
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/create" className="navbar-link">写文章</Link>
              <div className="navbar-user-section">
                <div
                  className="avatar-wrapper"
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                  title="点击更换头像"
                >
                  <img
                    src={user.avatar || getDefaultAvatar(user.username)}
                    alt={user.username}
                    className="user-avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = getDefaultAvatar(user.username || 'user')
                    }}
                  />
                  {showAvatarMenu && (
                    <div className="avatar-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="avatar-upload-label"
                        onClick={triggerAvatarUpload}
                      >
                        📷 {uploading ? '上传中...' : '更换头像'}
                      </button>
                      <div className="avatar-username">
                        {user.username}
                        {user.isAdmin && <span className="admin-badge">管理员</span>}
                      </div>
                    </div>
                  )}
                </div>
                <span className="navbar-username">
                  {user.username}
                  {user.isAdmin && <span className="admin-badge-inline">管理员</span>}
                </span>
                <button onClick={handleLogout} className="navbar-btn logout-btn">退出</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">登录</Link>
              <Link to="/register" className="navbar-link">注册</Link>
            </>
          )}
        </div>

        {/* 汉堡按钮 */}
        <button
          className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="切换菜单"
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          {user ? (
            <>
              <Link to="/create" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                ✍️ 写文章
              </Link>
              <div className="mobile-menu-user">
                {/* 移动端头像：点击也能更换头像（更符合用户习惯） */}
                <button
                  type="button"
                  className="mobile-avatar-btn"
                  onClick={triggerAvatarUpload}
                  title="点击更换头像"
                >
                  <img
                    src={user.avatar || getDefaultAvatar(user.username)}
                    alt={user.username}
                    className="user-avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = getDefaultAvatar(user.username || 'user')
                    }}
                  />
                  {uploading && <span className="mobile-avatar-uploading-mask">...</span>}
                </button>
                <div className="mobile-user-info">
                  <div className="mobile-username">
                    {user.username}
                    {user.isAdmin && <span className="admin-badge">管理员</span>}
                  </div>
                  <button
                    type="button"
                    className="mobile-avatar-change-btn"
                    onClick={triggerAvatarUpload}
                  >
                    {uploading ? '📤 上传中...' : '📷 更换头像'}
                  </button>
                </div>
              </div>
              <button onClick={handleLogout} className="mobile-menu-btn">退出登录</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                🔑 登录
              </Link>
              <Link to="/register" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                📝 注册
              </Link>
            </>
          )}
        </div>
      )}

      {/* 隐藏的文件选择 input（供桌面端和移动端共用） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        style={{ display: 'none' }}
      />
    </nav>
  )
}

export default Navbar
