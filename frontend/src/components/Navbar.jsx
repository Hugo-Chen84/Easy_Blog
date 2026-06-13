import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Navbar.css'

function Navbar({ user, setUser }) {
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return

    setUploading(true)
    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const token = localStorage.getItem('token')
      // ⚠️ 注意：不要手动设置 Content-Type！浏览器/axios 会自动为 FormData
      // 设置正确的 multipart/form-data 并附带 boundary，手动设置会导致解析失败
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
      setUser(updatedUser)
    } catch (err) {
      console.error('Upload error:', err)
      alert('头像上传失败: ' + (err.response?.data?.message || err.message))
    } finally {
      setUploading(false)
      setShowAvatarMenu(false)
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
                      e.currentTarget.src = getDefaultAvatar(user.username)
                    }}
                  />
                  {showAvatarMenu && (
                    <div className="avatar-menu" onClick={(e) => e.stopPropagation()}>
                      <label className="avatar-upload-label">
                        {uploading ? '上传中...' : '📷 更换头像'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <div className="avatar-username">{user.username}</div>
                    </div>
                  )}
                </div>
                <span className="navbar-username">{user.username}</span>
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
      </div>
    </nav>
  )
}

export default Navbar
