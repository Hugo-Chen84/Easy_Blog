import express from 'express'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { models } from '../models/index.js'

const router = express.Router()
const { Blog, User, Comment, Like } = models
const JWT_SECRET = 'your-secret-key-change-in-production'

// 验证 token 中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ message: '请先登录' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ message: 'token 无效' })
  }
}

// 在 authMiddleware 基础上，额外加载完整 User 信息（含 isAdmin 字段）
const authWithUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ message: '请先登录' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findByPk(decoded.id)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    req.user = user.toJSON()
    next()
  } catch (err) {
    res.status(401).json({ message: 'token 无效' })
  }
}

// 获取用户默认头像（用于老用户）
const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
}

// 格式化用户信息（确保有头像 + isAdmin）
const formatUser = (user) => {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar || getDefaultAvatar(user.username),
    isAdmin: !!user.isAdmin
  }
}

// 获取所有博客（支持分页）
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = Math.max(1, parseInt(req.query.pageSize) || 20)
    const offset = (page - 1) * pageSize

    const { count, rows } = await Blog.findAndCountAll({
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        { model: Like, as: 'likes' },
        { model: Comment, as: 'comments' }
      ],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
      limit: pageSize,
      offset
    })

    // 格式化返回数据
    const formattedBlogs = rows.map(blog => ({
      ...blog.toJSON(),
      author: formatUser(blog.author)
    }))

    res.json({
      items: formattedBlogs,
      total: count,
      page,
      pageSize
    })
  } catch (err) {
    res.status(500).json({ message: '获取博客列表失败', error: err.message })
  }
})

// 搜索博客（支持按作者/标题/内容，标题优先，分页）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = Math.max(1, parseInt(req.query.pageSize) || 20)
    const offset = (page - 1) * pageSize

    if (!keyword) {
      // 无关键词时退化为普通列表
      const { count, rows } = await Blog.findAndCountAll({
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
          { model: Like, as: 'likes' },
          { model: Comment, as: 'comments' }
        ],
        order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
        limit: pageSize,
        offset
      })
      const formattedBlogs = rows.map(blog => ({
        ...blog.toJSON(),
        author: formatUser(blog.author),
        matchedIn: null
      }))
      return res.json({ items: formattedBlogs, total: count, page, pageSize })
    }

    const likePattern = `%${keyword}%`

    // 1. 先查作者命中的博客（作者表关联匹配 username）
    const authorMatches = await Blog.findAll({
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar'],
          where: { username: { [Op.like]: likePattern } }
        },
        { model: Like, as: 'likes' },
        { model: Comment, as: 'comments' }
      ],
      order: [['createdAt', 'DESC']]
    })

    const authorMatchIds = new Set(authorMatches.map(b => b.id))

    // 2. 查标题命中（排除已在作者命中的）
    const titleMatches = await Blog.findAll({
      where: {
        title: { [Op.like]: likePattern },
        id: { [Op.notIn]: [...authorMatchIds] }
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        { model: Like, as: 'likes' },
        { model: Comment, as: 'comments' }
      ],
      order: [['createdAt', 'DESC']]
    })

    const titleMatchIds = new Set(titleMatches.map(b => b.id))
    const excludedIds = [...authorMatchIds, ...titleMatchIds]

    // 3. 查内容命中（排除已命中的）
    const contentMatches = await Blog.findAll({
      where: {
        content: { [Op.like]: likePattern },
        id: { [Op.notIn]: excludedIds }
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        { model: Like, as: 'likes' },
        { model: Comment, as: 'comments' }
      ],
      order: [['createdAt', 'DESC']]
    })

    // 合并并标记 matchedIn，顺序为 author -> title -> content
    const withMatchedIn = (items, matchedIn) =>
      items.map(blog => ({
        ...blog.toJSON(),
        author: formatUser(blog.toJSON().author),
        matchedIn
      }))

    const merged = [
      ...withMatchedIn(authorMatches, 'author'),
      ...withMatchedIn(titleMatches, 'title'),
      ...withMatchedIn(contentMatches, 'content')
    ]

    // 置顶帖始终排在最前面，然后保留原 matchedIn 优先级
    merged.sort((a, b) => {
      if ((a.isPinned ? 1 : 0) !== (b.isPinned ? 1 : 0)) return b.isPinned ? 1 : -1
      return 0
    })

    const total = merged.length
    const items = merged.slice(offset, offset + pageSize)

    res.json({ items, total, page, pageSize })
  } catch (err) {
    res.status(500).json({ message: '搜索失败', error: err.message })
  }
})

// 获取单篇博客
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        {
          model: Comment,
          as: 'comments',
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
          order: [['createdAt', 'DESC']]
        },
        { model: Like, as: 'likes' }
      ]
    })
    if (!blog) {
      return res.status(404).json({ message: '博客不存在' })
    }

    // 增加浏览次数
    await blog.increment('viewCount', { by: 1 })
    await blog.reload()

    // 格式化返回
    const blogData = blog.toJSON()
    blogData.author = formatUser(blogData.author)
    if (blogData.comments) {
      blogData.comments = blogData.comments.map(c => ({
        ...c,
        user: formatUser(c.user)
      }))
    }

    res.json(blogData)
  } catch (err) {
    res.status(500).json({ message: '获取博客详情失败', error: err.message })
  }
})

// 创建博客
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body
    const blog = await Blog.create({
      title,
      content,
      authorId: req.user.id,
      viewCount: 0
    })
    res.status(201).json(blog)
  } catch (err) {
    res.status(500).json({ message: '创建博客失败', error: err.message })
  }
})

// 点赞博客
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const blogId = req.params.id
    const userId = req.user.id

    // 检查是否已点赞
    const existingLike = await Like.findOne({ where: { blogId, userId } })
    if (existingLike) {
      return res.status(400).json({ message: '已经点赞过了' })
    }

    await Like.create({ blogId, userId })
    res.json({ message: '点赞成功' })
  } catch (err) {
    res.status(500).json({ message: '点赞失败', error: err.message })
  }
})

// 取消点赞
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    const blogId = req.params.id
    const userId = req.user.id

    const like = await Like.findOne({ where: { blogId, userId } })
    if (!like) {
      return res.status(400).json({ message: '还没有点赞' })
    }

    await like.destroy()
    res.json({ message: '取消点赞成功' })
  } catch (err) {
    res.status(500).json({ message: '取消点赞失败', error: err.message })
  }
})

// 添加评论
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const blogId = req.params.id
    const userId = req.user.id
    const { content } = req.body

    const comment = await Comment.create({ blogId, userId, content })
    res.status(201).json(comment)
  } catch (err) {
    res.status(500).json({ message: '评论失败', error: err.message })
  }
})

// 删除博客（作者本人或管理员可删除）
router.delete('/:id', authWithUser, async (req, res) => {
  try {
    const blogId = req.params.id
    const userId = req.user.id
    const isAdmin = !!req.user.isAdmin

    const blog = await Blog.findByPk(blogId)
    if (!blog) {
      return res.status(404).json({ message: '博客不存在' })
    }

    // 权限检查：作者本人或管理员
    if (blog.authorId !== userId && !isAdmin) {
      return res.status(403).json({ message: '没有权限删除这篇博客' })
    }

    // 删除评论和点赞
    await Comment.destroy({ where: { blogId } })
    await Like.destroy({ where: { blogId } })
    await blog.destroy()

    res.json({ message: '删除成功' })
  } catch (err) {
    res.status(500).json({ message: '删除失败', error: err.message })
  }
})

// 博客内容图片上传
// 通过 req.app.get('blogImagesDir') 读取 server.js 中定义的目录
const blogImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = req.app.get('blogImagesDir') || path.join(process.cwd(), 'backend', 'uploads', 'blog-images')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `blog-${Date.now()}${ext}`)
  }
})
const blogImageUpload = multer({
  storage: blogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('只支持图片文件'))
  }
})

// 上传博客图片（登录用户）
router.post('/upload-image', authMiddleware, (req, res) => {
  blogImageUpload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || '上传失败' })
    }
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片文件' })
    }
    const imageUrl = `/uploads/blog-images/${req.file.filename}`
    res.json({ url: imageUrl, message: '上传成功' })
  })
})

export default router
