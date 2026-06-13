import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './BlogDetail.css'

// 判断内容是否为 HTML（富文本模式产生的）
// 更严格的判定：只有当内容以 HTML 标签开头，或以 HTML 为主要结构时才判定为 HTML
function isHtmlContent(content) {
  if (!content) return false
  const trimmed = content.trim()
  if (!trimmed) return false
  // 1. 以 HTML 标签开头 → 很可能是富文本
  const startsWithHtml = /^<(div|p|span|h[1-6]|strong|em|b|i|u|ul|ol|li|a|img|pre|code|blockquote|table|hr|br)[^>]*>/i
  if (startsWithHtml.test(trimmed)) return true
  // 2. 统计 HTML 标签数量与非空行数的比例
  const tagMatches = trimmed.match(/<\/?(div|p|h[1-6]|strong|em|b|i|u|br|ul|ol|li|a|img|blockquote|pre|code|span|table)[^>]*>/gi) || []
  const lineCount = trimmed.split(/\n/).filter(l => l.trim().length > 0).length || 1
  if (tagMatches.length > lineCount * 0.5) return true
  return false
}

function BlogDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!user) {
      alert('请先登录')
      return
    }
    if (!window.confirm('确定删除这篇博客吗？此操作不可恢复。')) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/blogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('删除成功')
      navigate('/')
    } catch (err) {
      alert('删除失败：' + (err.response?.data?.message || err.message))
    } finally {
      setDeleting(false)
    }
  }

  const getDefaultAvatar = (username) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
  }

  // 判断当前用户是否有权限删除
  const canDelete = () => {
    if (!user || !blog) return false
    // 作者本人（宽松比较，防止 id 类型不一致）
    if (String(blog.author?.id) === String(user.id)) return true
    // 管理员可删除所有博客（真值判断）
    if (user.isAdmin === true || user.isAdmin === 'true' ||
        user.isAdmin === 1 || user.isAdmin === '1' ||
        !!user.isAdmin) return true
    return false
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
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = getDefaultAvatar(blog.author?.username || 'user')
              }}
            />
            <div className="blog-detail-header-info">
              <h1 className="blog-title">{blog.title}</h1>
              <div className="blog-meta">
                <span className="blog-author">作者: {blog.author?.username || '匿名'}</span>
                <span className="blog-date">{new Date(blog.createdAt).toLocaleString()}</span>
                <span className="blog-view-count">👁️ 浏览 {blog.viewCount || 0}</span>
                {blog.isPinned && <span className="pinned-badge">📌 置顶</span>}
              </div>
            </div>
          </div>

          {/* 博客正文：根据内容自动选择渲染方式 */}
          <div className="blog-body">
            {isHtmlContent(blog.content) ? (
              // 富文本模式：直接渲染 HTML
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: blog.content }} />
            ) : (
              // Markdown 模式：统一用 markdown-content 包装，便于 CSS 精确命中
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* 操作按钮区 */}
          <div className="blog-actions">
            <button
              onClick={handleLike}
              className={`like-btn ${isLiked ? 'liked' : ''}`}
            >
              {isLiked ? '❤️ 已点赞' : '🤍 点赞'} ({blog.likes?.length || 0})
            </button>

            {canDelete() && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="delete-btn"
              >
                {deleting ? '删除中...' : '🗑️ 删除博客'}
              </button>
            )}
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
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = getDefaultAvatar(c.user?.username || 'user')
                  }}
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
