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
  const [githubInfo, setGitHubInfo] = useState(null)
  const [githubPolling, setGitHubPolling] = useState(false)

  useEffect(() => {
    if (!formData.username.trim()) {
      setUsernameStatus('')
      return
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await axios.get(`/api/auth/check-username?username=${encodeURIComponent(formData.username)}`)
        setUsernameStatus(res.data.exists ? 'taken' : 'available')
      } catch {
        setUsernameStatus('')
      } finally {
        setCheckingUsername(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [formData.username])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (usernameStatus === 'taken') {
      setError('用户名已被占用')
      return
    }
    if (!formData.password || !formData.confirmPassword) {
      setError('请填写密码')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('两次密码不一致')
      return
    }

    try {
      const submitData = {
        username: formData.username.trim(),
        password: formData.password
      }
      await axios.post('/api/auth/register', submitData)
      setSuccess('注册成功！即将跳转到登录页...')
      setTimeout(() => { window.location.href = '/login' }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || '注册失败')
    }
  }

  const onGitHubClick = async () => {
    if (githubPolling) return
    setError('')
    setGitHubPolling(true)

    try {
      const codeRes = await axios.post('/api/auth/github/device-code')
      const { userCode, deviceCode, verificationUri, expiresIn, intervalMs } = codeRes.data
      setGitHubInfo({
        userCode,
        deviceCode,
        verificationUri,
        expiresAt: Date.now() + (expiresIn || 900) * 1000
      })

      let totalMs = 0
      const maxMs = (expiresIn || 900) * 1000
      const interval = intervalMs || 5000

      const poll = async () => {
        try {
          const pollRes = await axios.post('/api/auth/github/poll', { deviceCode })
          if (pollRes.data.status === 'success') {
            localStorage.setItem('token', pollRes.data.token)
            localStorage.setItem('user', JSON.stringify(pollRes.data.user))
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
          setGitHubPolling(false)
          setGitHubInfo(null)
          setError(pollRes.data.message || '登录失败，请重试')
        } catch (pollErr) {
          const msg = pollErr.response?.data?.message || pollErr.message
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
              className={
                usernameStatus === 'taken'
                  ? 'input-error'
                  : usernameStatus === 'available'
                    ? 'input-success'
                    : ''
              }
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
            <span>{githubPolling ? '等待 GitHub 授权...' : '使用 GitHub 注册'}</span>
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

        <p className="auth-switch">已有账号？<a href="/login">去登录</a></p>
      </div>
    </div>
  )
}

export default Register
