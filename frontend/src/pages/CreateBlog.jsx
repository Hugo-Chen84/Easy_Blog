import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './CreateBlog.css'

function CreateBlog({ user }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('标题和内容不能为空')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/blogs', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate(`/blog/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.message || '创建失败')
    }
  }

  return (
    <div className="create-blog">
      <div className="create-blog-container">
        <h1 className="create-title">写文章</h1>
        {error && <div className="create-error">{error}</div>}
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="请输入文章标题"
            />
          </div>
          <div className="form-group">
            <label>内容</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="请输入文章内容"
              rows={15}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="cancel-btn">取消</button>
            <button type="submit" className="submit-btn">发布</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateBlog
