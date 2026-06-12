import express from 'express'
import cors from 'cors'
import { sequelize } from './src/models/index.js'
import authRoutes from './src/routes/auth.js'
import blogRoutes from './src/routes/blog.js'

const app = express()
const PORT = 5000

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/blogs', blogRoutes)

// 数据库同步后启动服务器
sequelize.sync({ force: false }).then(() => {
  console.log('数据库同步成功')
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('数据库同步失败:', err)
})
