import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { models } from '../models/index.js'

const router = express.Router()
const { User } = models
const JWT_SECRET = 'your-secret-key-change-in-production'

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await User.create({
      username,
      password: hashedPassword
    })

    res.status(201).json({ message: '注册成功' })
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

    // 生成 token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d'
    })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    })
  } catch (err) {
    res.status(500).json({ message: '登录失败', error: err.message })
  }
})

export default router
