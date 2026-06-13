import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './BlogDetail.css'

function BlogDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    fetchBlog()
  }, [id])

  const fetchBlog = async () => {
    try {
      const res = await axios.get(`/api/blogs/${id}`)
      setBlog(res.data)
      // 检查当前用户是否已点赞
      if (user && res.data.likes) {
        setIsLiked(res.data.likes.some(like => like.userId === user.id))
      }
    } catch (err) {
      console.error('获取博客详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('请先登录')
      return
    }
    try {
      const token = localStorage.getItem('token')
      if (isLiked) {
        await axios.delete(`/api/blogs/${id}/like`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`/api/blogs/${id}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      fetchBlog()
    } catch (err) {
      console.error('操作失败:', err)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('请先登录')
      return
    }
    if (!comment.trim()) return

    try {
      const token = localStorage.getItem('token')
      await axios.post(`/api/blogs/${id}/comments`,
        { content: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setComment('')
      fetchBlog()
    } catch (err) {
      console.error('评论失败:', err)
    }
  }

  const getDefaultAvatar = (username) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!blog) {
    return <div className="loading">博客不存在</div>
  }

  return (
    <div className="blog-detail">
      <div className="blog-detail-container">
        <button onClick={() => navigate(-1)} className="back-btn">← 返回</button>

        <article className="blog-content">
          <div className="blog-detail-header">
            <img
              src={blog.author?.avatar || (blog.author?.username && getDefaultAvatar(blog.author.username))}
              alt={blog.author?.username || '匿名'}
              className="blog-detail-avatar"
            />
            <div className="blog-detail-header-info">
              <h1 className="blog-title">{blog.title}</h1>
              <div className="blog-meta">
                <span className="blog-author">作者: {blog.author?.username || '匿名'}</span>
                <span className="blog-date">{new Date(blog.createdAt).toLocaleString()}</span>
                <span className="blog-view-count">👁️ 浏览 {blog.viewCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="blog-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {blog.content}
            </ReactMarkdown>
          </div>

          <div className="blog-actions">
            <button
              onClick={handleLike}
              className={`like-btn ${isLiked ? 'liked' : ''}`}
            >
              {isLiked ? '❤️ 已点赞' : '🤍 点赞'} ({blog.likes?.length || 0})
            </button>
          </div>
        </article>

        <section className="comments-section">
          <h2 className="comments-title">评论 ({blog.comments?.length || 0})</h2>

          {user && (
            <form onSubmit={handleComment} className="comment-form">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写下你的评论..."
                rows={3}
              />
              <button type="submit" className="comment-btn">发表评论</button>
            </form>
          )}

          <div className="comments-list">
            {blog.comments?.length === 0 && (
              <div className="no-comments">暂无评论，快来抢沙发！</div>
            )}
            {blog.comments?.map(c => (
              <div key={c.id} className="comment-item">
                <img
                  src={c.user?.avatar || (c.user?.username && getDefaultAvatar(c.user.username))}
                  alt={c.user?.username || '匿名'}
                  className="comment-avatar"
                />
                <div className="comment-content-wrapper">
                  <div className="comment-header">
                    <span className="comment-author">{c.user?.username || '匿名'}</span>
                    <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="comment-text">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default BlogDetail
