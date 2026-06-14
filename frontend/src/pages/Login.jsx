import { useState } from 'react'
import axios from 'axios'
import './Login.css'

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [githubInfo, setGitHubInfo] = useState(null)
  const [githubPolling, setGitHubPolling] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post('/api/auth/login', formData)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      if (setUser) setUser(res.data.user)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.message || '登录失败')
    }
  }

  const onGitHubClick = async () => {
    if (githubPolling) return
    setError('')
    setGitHubPolling(true)

    // 第 1 步：向后端请求 device code
    try {
      const codeRes = await axios.post('/api/auth/github/device-code')
      const { userCode, deviceCode, verificationUri, expiresIn, intervalMs } = codeRes.data
      setGitHubInfo({
        userCode,
        deviceCode,
        verificationUri,
        expiresAt: Date.now() + (expiresIn || 900) * 1000
      })

      // 第 2 步：轮询后端等待用户授权
      let totalMs = 0
      const maxMs = (expiresIn || 900) * 1000
      const interval = intervalMs || 5000

      const poll = async () => {
        try {
          const pollRes = await axios.post('/api/auth/github/poll', { deviceCode })
          if (pollRes.data.status === 'success') {
            localStorage.setItem('token', pollRes.data.token)
            localStorage.setItem('user', JSON.stringify(pollRes.data.user))
            if (setUser) setUser(pollRes.data.user)
            setGitHubPolling(false)
            setGitHubInfo(null)
            window.location.href = '/'
            return
          }
          if (pollRes.data.status === 'slow_down') {
            totalMs += Math.max(interval, 10000)
            setTimeout(poll, Math.max(interval, 10000))
            return
          }
          if (pollRes.data.status === 'pending') {
            totalMs += interval
            if (totalMs < maxMs) {
              setTimeout(poll, interval)
            } else {
              setGitHubPolling(false)
              setGitHubInfo(null)
              setError('授权超时，请重试')
            }
            return
          }
          // 其他错误（expired/denied）
          setGitHubPolling(false)
          setGitHubInfo(null)
          setError(pollRes.data.message || '登录失败，请重试')
        } catch (pollErr) {
          const msg = pollErr.response?.data?.message || pollErr.message
          // 仅在未过期时继续
          totalMs += interval
          if (totalMs < maxMs) {
            setTimeout(poll, interval)
          } else {
            setGitHubPolling(false)
            setGitHubInfo(null)
            setError(msg || '登录失败，请重试')
          }
        }
      }

      setTimeout(poll, interval)
    } catch (err) {
      setGitHubPolling(false)
      setGitHubInfo(null)
      setError(err.response?.data?.message || 'GitHub 登录失败，请稍后再试')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">登录</h1>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
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
          <button type="submit" className="auth-btn">登录</button>
        </form>

        <div className="github-auth-section">
          <div className="divider-text">或</div>
          <button
            type="button"
            className="github-btn"
            onClick={onGitHubClick}
            disabled={githubPolling}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.19-3.07-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.17a11.02 11.02 0 0 1 5.79 0c2.21-1.48 3.18-1.17 3.18-1.17.63 1.59.23 2.77.12 3.06.74.8 1.19 1.82 1.19 3.07 0 4.41-2.68 5.38-5.24 5.67.41.35.78 1.04.78 2.11 0 1.52-.01 2.75-.01 3.12 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
            </svg>
            <span>{githubPolling ? '等待 GitHub 授权...' : '使用 GitHub 登录'}</span>
          </button>

          {githubInfo && (
            <div className="github-device-info">
              <div className="github-device-title">请在浏览器中打开以下地址并输入验证码</div>
              <a
                className="github-device-link"
                href={githubInfo.verificationUri}
                target="_blank"
                rel="noopener noreferrer"
              >
                {githubInfo.verificationUri}
              </a>
              <div
                className="github-device-code"
                title="点击复制"
                onClick={() => {
                  try { navigator.clipboard?.writeText(githubInfo.userCode) } catch (_) {}
                }}
              >
                {githubInfo.userCode}
              </div>
              <div className="github-device-hint">
                完成授权后将自动登录。
                {githubInfo.expiresAt &&
                  ` （剩余约 ${Math.max(0, Math.floor((githubInfo.expiresAt - Date.now()) / 60000))} 分钟）`}
              </div>
            </div>
          )}
        </div>

        <p className="auth-switch">还没有账号？<a href="/register">去注册</a></p>
      </div>
    </div>
  )
}

export default Login
