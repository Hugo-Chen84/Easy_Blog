import { useState, useEffect } from 'react'
import axios from 'axios'
import './Login.css'

// GitHub Device Flow 登录：向 GitHub 请求 device code，
// 展示 user_code + 链接让用户去 github.com/login/device 授权，
// 然后轮询直到拿到 access_token，最后 POST 到后端完成登录。
async function handleGitHubLogin(setError, setGitHubInfo, setPolling) {
  try {
    setError('')

    // 1. 检查后端是否启用 GitHub 登录
    const cfgRes = await axios.get('/api/auth/github-config')
    const { enabled, clientId } = cfgRes.data || {}
    if (!enabled || !clientId) {
      setError('管理员未配置 GitHub 登录')
      return
    }

    // 2. 向 GitHub 请求 device code
    const deviceRes = await axios.post(
      'https://github.com/login/device/code',
      { client_id: clientId, scope: 'read:user' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )
    const {
      user_code: userCode,
      device_code: deviceCode,
      verification_uri: verificationUri,
      interval,
      expires_in: expiresIn
    } = deviceRes.data || {}

    if (!userCode || !deviceCode) {
      setError('无法从 GitHub 获取授权码，请稍后再试')
      return
    }

    // 展示 user_code + 链接
    setGitHubInfo({
      userCode,
      deviceCode,
      verificationUri: verificationUri || 'https://github.com/login/device',
      clientId,
      interval: (interval || 5) * 1000,
      expiresAt: Date.now() + (expiresIn || 900) * 1000
    })
    setPolling(true)

    // 3. 轮询 GitHub 直到获取 access_token
    let accessToken = null
    let lastError = null
    // 轮询最多 expiring 时间，避免无限轮询
    const startTime = Date.now()
    const pollInterval = (interval || 5) * 1000

    while (!accessToken && Date.now() - startTime < (expiresIn || 900) * 1000) {
      await new Promise((r) => setTimeout(r, pollInterval))
      try {
        const pollRes = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        )
        const data = pollRes.data || {}
        if (data.access_token) {
          accessToken = data.access_token
          break
        }
        // GitHub 标准错误：authorization_pending / slow_down / expired_token
        if (data.error === 'expired_token') {
          lastError = '授权码已过期，请重试'
          break
        }
        if (data.error === 'access_denied') {
          lastError = '已拒绝授权'
          break
        }
        // 其它错误（如 slow_down / authorization_pending）继续轮询
      } catch (pollErr) {
        // 网络错误继续尝试
        lastError = pollErr.message
      }
    }

    if (!accessToken) {
      setGitHubInfo(null)
      setPolling(false)
      setError(lastError || '未在有效时间内完成授权，请重试')
      return
    }

    // 4. 将 token 发送给后端完成登录
    const loginRes = await axios.post('/api/auth/github-login', {
      accessToken,
      clientId,
      deviceCode
    }, {
      headers: { 'Content-Type': 'application/json' }
    })

    localStorage.setItem('token', loginRes.data.token)
    localStorage.setItem('user', JSON.stringify(loginRes.data.user))

    setGitHubInfo(null)
    setPolling(false)

    // 通知父组件 / 或直接刷新
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  } catch (err) {
    setGitHubInfo(null)
    setPolling(false)
    const msg =
      err.response?.data?.message ||
      err.message ||
      'GitHub 登录失败，请稍后再试'
    setError(msg)
  }
}

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [githubInfo, setGitHubInfo] = useState(null)
  const [githubPolling, setGitHubPolling] = useState(false)

  // 如果父组件通过 props 传递 setUser，登录完成后也更新它
  useEffect(() => {
    // （刷新后由 App 从 localStorage 读取）
  }, [])

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

  const onGitHubClick = () => {
    if (githubPolling) return
    handleGitHubLogin(setError, setGitHubInfo, setGitHubPolling)
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

        {/* GitHub Device Flow 登录 */}
        <div className="github-auth-section">
          <div className="divider-text">或</div>
          <button
            type="button"
            className="github-btn"
            onClick={onGitHubClick}
            disabled={githubPolling}
          >
            {/* GitHub 图标（内联 SVG） */}
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.19-3.07-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.17a11.02 11.02 0 0 1 5.79 0c2.21-1.48 3.18-1.17 3.18-1.17.63 1.59.23 2.77.12 3.06.74.8 1.19 1.82 1.19 3.07 0 4.41-2.68 5.38-5.24 5.67.41.35.78 1.04.78 2.11 0 1.52-.01 2.75-.01 3.12 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
            </svg>
            <span>
              {githubPolling ? '等待 GitHub 授权...' : '使用 GitHub 登录'}
            </span>
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
              <div className="github-device-code" title="点击复制" onClick={() => {
                try { navigator.clipboard?.writeText(githubInfo.userCode) } catch (_) {}
              }}>
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

        <p className="auth-switch">
          还没有账号？<a href="/register">去注册</a>
        </p>
      </div>
    </div>
  )
}

export default Login
