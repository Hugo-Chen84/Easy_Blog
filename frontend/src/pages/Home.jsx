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
      setBlogs(res.data)
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
      const res = await axios.get(`/api/blogs/search?keyword=${searchQuery}`)
      setBlogs(res.data)
    } catch (err) {
      console.error('搜索失败:', err)
    }
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
              <Link to={`/blog/${blog.id}`} key={blog.id} className="blog-card">
                <h2 className="blog-title">{blog.title}</h2>
                <p className="blog-summary">{blog.content.substring(0, 150)}...</p>
                <div className="blog-meta">
                  <span className="blog-author">作者: {blog.author?.username || '匿名'}</span>
                  <span className="blog-date">{new Date(blog.createdAt).toLocaleDateString()}</span>
                  <span className="blog-likes">❤️ {blog.likes?.length || 0}</span>
                  <span className="blog-comments">💬 {blog.comments?.length || 0}</span>
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
