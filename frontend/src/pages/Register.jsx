import { useState, useEffect } from 'react'
import axios from 'axios'
import './Login.css'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [usernameStatus, setUsernameStatus] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)

  useEffect(() => {
    if (!formData.username.trim()) {
      setUsernameStatus('')
      return
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await axios.get(`/api/auth/check-username?username=${encodeURIComponent(formData.username)}`)
        if (res.data.exists) {
          setUsernameStatus('taken')
        } else {
          setUsernameStatus('available')
        }
      } catch (err) {
        setUsernameStatus('')
      } finally {
        setCheckingUsername(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [formData.username])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (usernameStatus === 'taken') {
      setError('用户名已被占用')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次密码不一致')
      return
    }

    try {
      await axios.post('/api/auth/register', {
        username: formData.username,
        password: formData.password
      })
      setSuccess('注册成功！请登录')
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || '注册失败')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">注册</h1>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={usernameStatus === 'taken' ? 'input-error' : usernameStatus === 'available' ? 'input-success' : ''}
              required
            />
            {checkingUsername && <div className="form-hint">正在检查...</div>}
            {usernameStatus === 'taken' && <div className="form-hint error-hint">❌ 用户名已被占用</div>}
            {usernameStatus === 'available' && <div className="form-hint success-hint">✅ 用户名可用</div>}
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="auth-btn">注册</button>
        </form>
        <p className="auth-switch">
          已有账号？<a href="/login">去登录</a>
        </p>
      </div>
    </div>
  )
}

export default Register
