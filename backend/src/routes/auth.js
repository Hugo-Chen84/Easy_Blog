import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { models } from '../models/index.js'

const router = express.Router()
const { User } = models
const JWT_SECRET = 'your-secret-key-change-in-production'

// 从环境变量读取 GitHub Client ID（未配置则关闭功能）
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''

// 生成默认头像 URL（基于用户名）
const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
}

// 返回 GitHub 配置是否启用
router.get('/github-config', async (req, res) => {
  try {
    res.json({
      enabled: !!GITHUB_CLIENT_ID,
      clientId: GITHUB_CLIENT_ID || ''
    })
  } catch (err) {
    res.status(500).json({ message: '获取配置失败', error: err.message })
  }
})

// ============================================================
// GitHub Device Flow 登录（第 1 步）：向后端请求 device code
// ============================================================
router.post('/github/device-code', async (req, res) => {
  try {
    if (!GITHUB_CLIENT_ID) {
      return res.status(503).json({ message: '管理员未配置 GitHub 登录（GITHUB_CLIENT_ID')
    }
    const githubRes = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'read:user'
      })
    })
    const data = await githubRes.json() || {}
    if (!data.user_code || !data.device_code) {
      return res.status(400).json({
        message: 'GitHub 未返回有效的 device code'
      })
    }
    res.json({
      userCode: data.user_code,
      deviceCode: data.device_code,
      verificationUri: data.verification_uri || 'https://github.com/login/device',
      expiresIn: data.expires_in || 900,
      intervalMs: (data.interval || 5) * 1000
    })
  } catch (err) {
    res.status(502).json({
      message: '向 GitHub 请求 device code 失败：' + err.message
    })
  }
})

// ============================================================
// GitHub Device Flow 登录（第 2 步）：轮询 GitHub 获取 access_token
// ============================================================
router.post('/github/poll', async (req, res) => {
  try {
    if (!GITHUB_CLIENT_ID) {
      return res.status(503).json({ message: '管理员未配置 GitHub 登录' })
    }
    const { deviceCode } = req.body
    if (!deviceCode) {
      return res.status(400).json({ message: '缺少 deviceCode' })
    }
    const githubRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    })
    const data = await githubRes.json() || {}

    // 1) 拿到 token → 完成登录/注册
    if (data.access_token) {
      // 从 GitHub API 获取用户信息
      let githubUser
      try {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Accept': 'application/json',
            'User-Agent': 'Easy-Blog-App'
          }
        })
        if (!userRes.ok) {
          return res.status(400).json({ message: 'GitHub API 验证失败' })
        }
        githubUser = await userRes.json()
      } catch (apiErr) {
        return res.status(502).json({ message: '调用 GitHub API 失败：' + apiErr.message })
      }
      const githubId = String(githubUser.id)
      if (!githubId) {
        return res.status(400).json({ message: 'GitHub 未返回有效的用户标识' })
      }

      // 查找或创建用户（以 githubId 为关键字）
      let user = await User.findOne({ where: { githubId } })
      if (!user) {
        const base = String(githubUser.login || 'github_user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .slice(0, 16) || 'github_user'
        let candidate = `${base}_gh`
        let counter = 1
        while (counter <= 100) {
          const existing = await User.findOne({ where: { username: candidate } })
          if (!existing) break
          candidate = `${base.slice(0, 16 - `_gh${counter}`.length)}_gh${counter}`
          counter++
        }
        if (counter > 100) {
          candidate = `gh_user_${Date.now().toString().slice(-8)}`
        }
        const avatar = githubUser.avatar_url || getDefaultAvatar(candidate)
        user = await User.create({
          username: candidate,
          password: await bcrypt.hash(`gh_${githubId}_${JWT_SECRET}`, 10),
          avatar,
          githubId,
          isAdmin: false
        })
      } else if (!user.avatar && githubUser.avatar_url) {
        await user.update({ avatar: githubUser.avatar_url })
        user = await User.findByPk(user.id)
      }

      const jwtToken = jwt.sign(
        { id: user.id, username: user.username, isAdmin: !!user.isAdmin },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return res.json({
        status: 'success',
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar || getDefaultAvatar(user.username),
          isAdmin: !!user.isAdmin
        }
      })
    }

    // 2) 其他状态：pending / slow_down / expired_token / access_denied
    if (data.error === 'authorization_pending') {
      return res.json({ status: 'pending' })
    }
    if (data.error === 'slow_down') {
      return res.json({ status: 'slow_down' })
    }
    if (data.error === 'expired_token') {
      return res.status(400).json({ status: 'expired', message: '授权码已过期，请重试' })
    }
    if (data.error === 'access_denied') {
      return res.status(400).json({ status: 'denied', message: '用户拒绝了授权' })
    }
    return res.status(400).json({
      status: 'error',
      message: data.error_description || 'GitHub 登录失败'
    })
  } catch (err) {
    res.status(500).json({ message: 'GitHub 登录失败：' + err.message })
  }
})

// 检查用户名是否已存在
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query
    if (!username) return res.status(400).json({ message: '用户名不能为空' })
    const existingUser = await User.findOne({ where: { username } })
    res.json({ exists: !!existingUser })
  } catch (err) {
    res.status(500).json({ message: '检查失败', error: err.message })
  }
})

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' })
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户（带默认头像）
    const defaultAvatar = getDefaultAvatar(username)
    const user = await User.create({
      username,
      password: hashedPassword,
      avatar: defaultAvatar,
      isAdmin: false
    })

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isAdmin: !!user.isAdmin
      }
    })
  } catch (err) {
    res.status(500).json({ message: '注册失败', error: err.message })
  }
})

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // 查找用户
    const user = await User.findOne({ where: { username } })
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    // 确保有头像（老用户可能没有）
    let avatar = user.avatar
    if (!avatar) {
      avatar = getDefaultAvatar(user.username)
      await user.update({ avatar })
    }

    // 生成 token（包含 isAdmin，便于后续各接口做权限判断）
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: !!user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: avatar,
        isAdmin: !!user.isAdmin
      }
    })
  } catch (err) {
    res.status(500).json({ message: '登录失败', error: err.message })
  }
})

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: '请先登录' })
    }
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (e) {
      return res.status(401).json({ message: 'token 无效或已过期' })
    }
    const user = await User.findByPk(decoded.id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    let avatar = user.avatar
    if (!avatar) {
      avatar = getDefaultAvatar(user.username)
      await user.update({ avatar })
    }

    res.json({
      id: user.id,
      username: user.username,
      avatar: avatar,
      isAdmin: !!user.isAdmin
    })
  } catch (err) {
    res.status(401).json({ message: 'token 无效或已过期' })
  }
})

// 上传头像
router.post('/upload-avatar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: '请先登录' })
    }
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (e) {
      return res.status(401).json({ message: 'token 无效或已过期' })
    }
    const user = await User.findByPk(decoded.id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const avatarUpload = req.app.get('avatarUpload')
    avatarUpload.single('avatar')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || '上传失败' })
      }
      if (!req.file) {
        return res.status(400).json({ message: '请选择图片文件' })
      }

      const avatarPath = `/uploads/avatars/${req.file.filename}`
      await user.update({ avatar: avatarPath })

      res.json({
        message: '头像更新成功',
        avatar: avatarPath
      })
    })
  } catch (err) {
    res.status(500).json({ message: '上传失败', error: err.message })
  }
})

export default router
