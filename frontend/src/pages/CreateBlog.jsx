import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './CreateBlog.css'

function CreateBlog({ user }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  })
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

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

  // 插入 Markdown 语法
  const insertMarkdown = (syntax, wrap = true, placeholder = '') => {
    const textarea = document.querySelector('.blog-editor')
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = formData.content.substring(start, end) || placeholder
    const newContent = wrap
      ? formData.content.substring(0, start) + syntax + selectedText + syntax + formData.content.substring(end)
      : formData.content.substring(0, start) + syntax + selectedText + formData.content.substring(end)
    setFormData({ ...formData, content: newContent })
    // 恢复焦点
    setTimeout(() => {
      textarea.focus()
      const pos = wrap ? start + syntax.length + selectedText.length : start + syntax.length + selectedText.length
      textarea.setSelectionRange(pos, pos)
    }, 10)
  }

  const insertListItem = () => {
    const textarea = document.querySelector('.blog-editor')
    if (!textarea) return
    const start = textarea.selectionStart
    // 在当前行开头添加 - 
    const lineStart = formData.content.lastIndexOf('\n', start - 1) + 1
    const newContent = formData.content.substring(0, lineStart) + '- ' + formData.content.substring(lineStart)
    setFormData({ ...formData, content: newContent })
    setTimeout(() => {
      textarea.focus()
    }, 10)
  }

  const insertCodeBlock = () => {
    const textarea = document.querySelector('.blog-editor')
    if (!textarea) return
    const start = textarea.selectionStart
    const newContent = formData.content.substring(0, start) + '\n```\n\n```\n' + formData.content.substring(start)
    setFormData({ ...formData, content: newContent })
  }

  if (!user) {
    return (
      <div className="create-blog">
        <div className="create-blog-container">
          <div className="auth-required">请先登录后再发布文章</div>
          <a href="/login" className="auth-link">去登录</a>
        </div>
      </div>
    )
  }

  return (
    <div className="create-blog">
      <div className="create-blog-container">
        <div className="create-header">
          <h1 className="create-title">写文章</h1>
          <div className="view-toggle">
            <button
              onClick={() => setShowPreview(false)}
              className={`toggle-btn ${!showPreview ? 'active' : ''}`}
            >
              ✏️ 编辑
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`toggle-btn ${showPreview ? 'active' : ''}`}
            >
              👁️ 预览
            </button>
          </div>
        </div>

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
              className="title-input"
            />
          </div>

          {!showPreview && (
            <>
              <div className="toolbar">
                <button type="button" onClick={() => insertMarkdown('**', true, '粗体文字')} className="tool-btn" title="粗体">B</button>
                <button type="button" onClick={() => insertMarkdown('*', true, '斜体文字')} className="tool-btn" title="斜体" style={{ fontStyle: 'italic' }}>I</button>
                <span className="tool-divider"></span>
                <button type="button" onClick={() => insertMarkdown('## ', false, '二级标题')} className="tool-btn" title="标题">H</button>
                <button type="button" onClick={insertListItem} className="tool-btn" title="列表">•</button>
                <button type="button" onClick={() => insertMarkdown('`', true, 'code')} className="tool-btn" title="行内代码">{`</>`}</button>
                <button type="button" onClick={insertCodeBlock} className="tool-btn" title="代码块">{`{ }`}</button>
                <span className="tool-divider"></span>
                <button type="button" onClick={() => insertMarkdown('[链接](https://)', false, '')} className="tool-btn" title="链接">🔗</button>
                <button type="button" onClick={() => insertMarkdown('> ', false, '引用文字')} className="tool-btn" title="引用">❝</button>
              </div>

              <div className="form-group">
                <label>内容 <span className="hint">(支持 Markdown 语法)</span></label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder={`支持 Markdown 语法：\n\n# 一级标题\n## 二级标题\n\n**粗体** 和 *斜体*\n\n- 列表项 1\n- 列表项 2\n\n> 引用文字\n\n\`\`\`\n代码块\n\`\`\`\n\n[链接文字](https://example.com)`}
                  rows={18}
                  className="blog-editor"
                />
              </div>
            </>
          )}

          {showPreview && (
            <div className="form-group">
              <label>预览</label>
              <div className="preview-panel">
                {formData.content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {formData.content}
                  </ReactMarkdown>
                ) : (
                  <div className="empty-preview">在编辑区输入内容，预览将在这里显示</div>
                )}
              </div>
            </div>
          )}

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
