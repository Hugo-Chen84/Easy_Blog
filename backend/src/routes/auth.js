import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { models } from '../models/index.js'

const router = express.Router()
const { User } = models
const JWT_SECRET = 'your-secret-key-change-in-production'

// 生成默认头像 URL（基于用户名）
const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
}

// 检查用户名是否已存在
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query
    if (!username) {
      return res.status(400).json({ message: '用户名不能为空' })
    }
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
      avatar: defaultAvatar
    })

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar
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

    // 生成 token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d'
    })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: avatar
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
    const decoded = jwt.verify(token, JWT_SECRET)
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
      avatar: avatar
    })
  } catch (err) {
    res.status(401).json({ message: 'token 无效' })
  }
})

// 上传头像
router.post('/upload-avatar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: '请先登录' })
    }
    const decoded = jwt.verify(token, JWT_SECRET)
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
