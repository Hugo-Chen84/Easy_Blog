import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import multer from 'multer'
import bcryptjs from 'bcryptjs'
import { sequelize, models } from './src/models/index.js'
import authRoutes from './src/routes/auth.js'
import blogRoutes from './src/routes/blog.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// 中间件
app.use(cors())
app.use(express.json())

// 创建上传目录（头像 + 博客图片）
const uploadsDir = path.join(__dirname, 'uploads')
const avatarsDir = path.join(uploadsDir, 'avatars')
const blogImagesDir = path.join(uploadsDir, 'blog-images')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true })
if (!fs.existsSync(blogImagesDir)) fs.mkdirSync(blogImagesDir, { recursive: true })

// 把上传目录路径暴露给路由层（路由层通过 app.get 读取）
app.set('uploadsDir', uploadsDir)
app.set('blogImagesDir', blogImagesDir)

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

// 前端健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 托管前端静态文件（生产环境）
const distPath = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(distPath))

// 处理 SPA 路由
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next()
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

// 安全地确保数据库新列存在（对 SQLite 友好，重复执行安全）
const ensureColumns = async () => {
  try {
    // User 表
    try {
      const userCols = await sequelize.getQueryInterface().describeTable('users')
      if (!('githubId' in userCols)) {
        await sequelize.query("ALTER TABLE users ADD COLUMN githubId TEXT")
        console.log('✅ 已为 users 表添加 githubId 列')
      }
      if (!('isAdmin' in userCols)) {
        await sequelize.query("ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0")
        console.log('✅ 已为 users 表添加 isAdmin 列')
      }
    } catch (e) {
      console.warn('⚠️  users 表列检查跳过:', e.message)
    }

    // Blog 表
    try {
      const blogCols = await sequelize.getQueryInterface().describeTable('blogs')
      if (!('isPinned' in blogCols)) {
        await sequelize.query("ALTER TABLE blogs ADD COLUMN isPinned INTEGER DEFAULT 0")
        console.log('✅ 已为 blogs 表添加 isPinned 列')
      }
    } catch (e) {
      console.warn('⚠️  blogs 表列检查跳过:', e.message)
    }
  } catch (err) {
    console.warn('⚠️  ensureColumns 警告:', err.message)
  }
}

// 种子数据：创建管理员和欢迎置顶帖
const seedWelcomePost = async () => {
  try {
    const { User, Blog } = models
    const ADMIN_USERNAME = '管理员'
    let admin = await User.findOne({ where: { username: ADMIN_USERNAME } })
    if (!admin) {
      const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ADMIN_USERNAME)}`
      admin = await User.create({
        username: ADMIN_USERNAME,
        password: await bcryptjs.hash('admin123456', 10),
        avatar: defaultAvatar,
        isAdmin: true
      })
      console.log('✅ 已创建管理员账号（用户名：管理员，默认密码：admin123456）')
    } else {
      // 确保已有管理员账号的 isAdmin 为 true
      if (!admin.isAdmin) {
        await admin.update({ isAdmin: true })
        console.log('✅ 已将管理员账号标记为 isAdmin=true')
      } else {
        console.log('ℹ️  管理员账号已存在')
      }
    }

    // 2) 创建欢迎置顶帖
    const WELCOME_TITLE = 'Welcome to Easy Blog!'
    const WELCOME_CONTENT =
      'Hello，这是一个小型的博客网站，来自一个CS小白的vibecoding实践，欢迎批评指正，也欢迎在这里分享你的想法。'
    const existing = await Blog.findOne({ where: { title: WELCOME_TITLE, authorId: admin.id } })
    if (!existing) {
      await Blog.create({
        title: WELCOME_TITLE,
        content: WELCOME_CONTENT,
        authorId: admin.id,
        viewCount: 0,
        isPinned: true
      })
      console.log('✅ 已创建欢迎置顶帖')
    } else {
      if (!existing.isPinned) {
        await existing.update({ isPinned: true })
        console.log('✅ 欢迎帖已设置为置顶')
      } else {
        console.log('ℹ️  欢迎置顶帖已存在')
      }
    }
  } catch (err) {
    console.warn('⚠️  种子数据初始化警告:', err.message)
  }
}

// 数据库同步 + 启动
sequelize.sync({ alter: true }).then(async () => {
  console.log('✅ 数据库结构同步完成')
  await ensureColumns()
  await seedWelcomePost()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('❌ 数据库初始化失败:', err.message)
  // 即使有错误也尝试启动（有时只是 alter 警告）
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚠️  服务器以受限模式运行在 http://localhost:${PORT}`)
  })
})
