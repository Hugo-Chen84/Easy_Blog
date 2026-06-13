import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { sequelize } from './src/models/index.js'
import authRoutes from './src/routes/auth.js'
import blogRoutes from './src/routes/blog.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// 中间件
app.use(cors())
app.use(express.json())

// 创建上传目录
const uploadsDir = path.join(__dirname, 'uploads')
const avatarsDir = path.join(uploadsDir, 'avatars')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir)
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir)

// 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `avatar-${Date.now()}${ext}`)
  }
})
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('只支持图片文件'))
  }
})
app.set('avatarUpload', avatarUpload)

// 托管上传文件
app.use('/uploads', express.static(uploadsDir))

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/blogs', blogRoutes)

// 托管前端静态文件（生产环境）
const distPath = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(distPath))

// 处理 SPA 路由 - 所有非 API、非静态文件请求返回 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next()
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

// 数据库同步后启动服务器 (alter: true 会添加新字段而不删除数据)
sequelize.sync({ alter: true }).then(() => {
  console.log('数据库同步成功')
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('数据库同步失败:', err)
})
