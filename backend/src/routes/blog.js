import express from 'express'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
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

// 获取用户默认头像（用于老用户）
const getDefaultAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
}

// 格式化用户信息（确保有头像）
const formatUser = (user) => {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar || getDefaultAvatar(user.username)
  }
}

// 获取所有博客
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.findAll({
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        { model: Like, as: 'likes' },
        { model: Comment, as: 'comments' }
      ],
      order: [['createdAt', 'DESC']]
    })

    // 格式化返回数据
    const formattedBlogs = blogs.map(blog => ({
      ...blog.toJSON(),
      author: formatUser(blog.author)
    }))

    res.json(formattedBlogs)
  } catch (err) {
    res.status(500).json({ message: '获取博客列表失败', error: err.message })
  }
})

// 搜索博客
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query
    const blogs = await Blog.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } }
        ]
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        { model: Like, as: 'likes' },
        { model: Comment, as: 'comments' }
      ],
      order: [['createdAt', 'DESC']]
    })

    const formattedBlogs = blogs.map(blog => ({
      ...blog.toJSON(),
      author: formatUser(blog.author)
    }))

    res.json(formattedBlogs)
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

export default router
