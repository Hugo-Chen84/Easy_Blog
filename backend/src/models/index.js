import path from 'path';
import { Sequelize } from 'sequelize'
import User from './User.js'
import Blog from './Blog.js'
import Comment from './Comment.js'
import Like from './Like.js'

// 使用 SQLite 数据库
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(path.dirname(new URL(import.meta.url).pathname), '../../database.sqlite'),
  logging: false
})

// 初始化模型
export const models = {
  User: User(sequelize),
  Blog: Blog(sequelize),
  Comment: Comment(sequelize),
  Like: Like(sequelize)
}

// 设置模型关联关系
const { User: UserModel, Blog: BlogModel, Comment: CommentModel, Like: LikeModel } = models

// 用户 - 博客：一对多
UserModel.hasMany(BlogModel, { foreignKey: 'authorId', as: 'blogs' })
BlogModel.belongsTo(UserModel, { foreignKey: 'authorId', as: 'author' })

// 用户 - 评论：一对多
UserModel.hasMany(CommentModel, { foreignKey: 'userId', as: 'comments' })
CommentModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' })

// 博客 - 评论：一对多
BlogModel.hasMany(CommentModel, { foreignKey: 'blogId', as: 'comments' })
CommentModel.belongsTo(BlogModel, { foreignKey: 'blogId', as: 'blog' })

// 用户 - 点赞：一对多
UserModel.hasMany(LikeModel, { foreignKey: 'userId', as: 'likes' })
LikeModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' })

// 博客 - 点赞：一对多
BlogModel.hasMany(LikeModel, { foreignKey: 'blogId', as: 'likes' })
LikeModel.belongsTo(BlogModel, { foreignKey: 'blogId', as: 'blog' })

export default sequelize
