import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Home.css'

function Home({ user }) {
  const [blogs, setBlogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      const res = await axios.get('/api/blogs')
      // 兼容分页结构 { items, total, page, pageSize } 与旧数组
      const data = res.data
      setBlogs(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      console.error('获取博客列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      fetchBlogs()
      return
    }
    try {
      const res = await axios.get(`/api/blogs/search?keyword=${encodeURIComponent(searchQuery)}`)
      const data = res.data
      setBlogs(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      console.error('搜索失败:', err)
    }
  }

  const getDefaultAvatar = (username) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
  }

  // 移除 Markdown 格式用于摘要
  const stripMarkdown = (text) => {
    if (!text) return ''
    return text
      .replace(/###?\s/g, '')
      .replace(/\*\*?/g, '')
      .replace(/~~/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/#/g, '')
      .replace(/[-*]/g, '')
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="home">
      <div className="home-container">
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="搜索博客..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">搜索</button>
          </form>
        </div>

        <div className="blog-list">
          {blogs.length === 0 ? (
            <div className="no-blogs">暂无博客文章</div>
          ) : (
            blogs.map(blog => (
              <Link
                to={`/blog/${blog.id}`}
                key={blog.id}
                className={`blog-card ${blog.isPinned ? 'blog-card-pinned' : ''}`}
              >
                <div className="blog-card-header">
                  <img
                    src={blog.author?.avatar || (blog.author?.username && getDefaultAvatar(blog.author.username))}
                    alt={blog.author?.username || '匿名'}
                    className="blog-card-avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = getDefaultAvatar(blog.author?.username || 'user')
                    }}
                  />
                  <div className="blog-card-author-info">
                    <span className="blog-author-name">{blog.author?.username || '匿名'}</span>
                    <span className="blog-date">{new Date(blog.createdAt).toLocaleDateString()}</span>
                  </div>
                  {blog.isPinned && <span className="pinned-badge">📌 置顶</span>}
                </div>
                <h2 className="blog-title">{blog.title}</h2>
                <p className="blog-summary">{stripMarkdown(blog.content).substring(0, 150)}...</p>
                <div className="blog-meta">
                  <span className="blog-likes">❤️ {blog.likes?.length || 0}</span>
                  <span className="blog-comments">💬 {blog.comments?.length || 0}</span>
                  <span className="blog-views">👁️ {blog.viewCount || 0}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
