import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './CreateBlog.css'

function CreateBlog({ user }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  // editorMode: 'rich' (所见即所得/富文本) 或 'markdown'
  const [editorMode, setEditorMode] = useState('rich')
  // 内容分别存储
  const [richContent, setRichContent] = useState('')
  const [markdownContent, setMarkdownContent] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const richEditorRef = useRef(null)
  const markdownTextareaRef = useRef(null)
  const hiddenImageInput = useRef(null)

  // 切换编辑器模式
  const toggleEditorMode = () => {
    const newMode = editorMode === 'rich' ? 'markdown' : 'rich'
    if (window.confirm('切换模式会重置当前内容（已输入的文字会丢失），确认切换吗？')) {
      setEditorMode(newMode)
      setRichContent('')
      setMarkdownContent('')
    }
  }

  // 上传图片
  const handleImageUpload = async () => {
    hiddenImageInput.current?.click()
  }

  const onImageSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('image', file)

      const res = await axios.post('/api/blogs/upload-image', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const imageUrl = res.data.url

      // 根据模式插入图片
      if (editorMode === 'rich') {
        // 在富文本编辑器光标处插入 img 标签
        const editor = richEditorRef.current
        if (editor) {
          editor.focus()
          const img = document.createElement('img')
          img.src = imageUrl
          img.style.maxWidth = '100%'
          img.style.borderRadius = '8px'
          img.style.margin = '8px 0'
          const selection = window.getSelection()
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            // 如果光标不在编辑器内，追加到末尾
            if (!editor.contains(range.commonAncestorContainer)) {
              editor.appendChild(img)
            } else {
              range.deleteContents()
              range.insertNode(img)
              // 把光标移到 img 后面
              range.setStartAfter(img)
              range.setEndAfter(img)
              selection.removeAllRanges()
              selection.addRange(range)
            }
          } else {
            editor.appendChild(img)
          }
          // 同步状态
          setRichContent(editor.innerHTML)
        }
      } else {
        // 在 Markdown 模式下插入 ![alt](url) 到光标位置
        const textarea = markdownTextareaRef.current
        if (textarea) {
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const before = markdownContent.substring(0, start)
          const after = markdownContent.substring(end)
          const markdownImage = `\n![图片](${imageUrl})\n`
          const newContent = before + markdownImage + after
          setMarkdownContent(newContent)
          // 恢复光标位置
          setTimeout(() => {
            textarea.focus()
            const pos = start + markdownImage.length
            textarea.setSelectionRange(pos, pos)
          }, 10)
        }
      }
    } catch (err) {
      setError('图片上传失败：' + (err.response?.data?.message || err.message))
    } finally {
      setUploadingImage(false)
      if (hiddenImageInput.current) hiddenImageInput.current.value = ''
    }
  }

  // 在富文本编辑器中插入格式化（使用 execCommand）
  const execRich = (command, value = null) => {
    const editor = richEditorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, value)
    setRichContent(editor.innerHTML)
  }

  const insertRichLink = () => {
    const url = prompt('请输入链接地址：', 'https://')
    if (url) {
      execRich('createLink', url)
    }
  }

  // Markdown 模式下的工具栏：在光标处插入语法
  const insertMarkdown = (syntax, wrap = true, placeholder = '') => {
    const textarea = markdownTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdownContent.substring(start, end) || placeholder
    const newContent = wrap
      ? markdownContent.substring(0, start) + syntax + selectedText + syntax + markdownContent.substring(end)
      : markdownContent.substring(0, start) + syntax + selectedText + markdownContent.substring(end)
    setMarkdownContent(newContent)
    setTimeout(() => {
      textarea.focus()
      const pos = wrap ? start + syntax.length + selectedText.length : start + syntax.length + selectedText.length
      textarea.setSelectionRange(pos, pos)
    }, 10)
  }

  const insertMarkdownListItem = () => {
    const textarea = markdownTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const lineStart = markdownContent.lastIndexOf('\n', start - 1) + 1
    const newContent = markdownContent.substring(0, lineStart) + '- ' + markdownContent.substring(lineStart)
    setMarkdownContent(newContent)
  }

  const insertMarkdownCodeBlock = () => {
    const textarea = markdownTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const newContent = markdownContent.substring(0, start) + '\n```\n\n```\n' + markdownContent.substring(start)
    setMarkdownContent(newContent)
  }

  // 获得用于预览/提交的最终内容
  const getFinalContent = () => {
    if (editorMode === 'rich') {
      return richContent
    }
    return markdownContent
  }

  const hasContent = () => {
    if (editorMode === 'rich') {
      return richContent && richContent.replace(/<[^>]*>/g, '').trim().length > 0
    }
    return markdownContent && markdownContent.trim().length > 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('请输入标题')
      return
    }
    if (!hasContent()) {
      setError('请输入博客内容')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/blogs', {
        title: title.trim(),
        content: getFinalContent()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || '创建失败')
    }
  }

  // 富文本编辑器内容变化
  const onRichInput = () => {
    if (richEditorRef.current) {
      setRichContent(richEditorRef.current.innerHTML)
    }
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

  // 用于预览的内容渲染
  const previewContent = getFinalContent()

  return (
    <div className="create-blog">
      <div className="create-blog-container">
        <div className="create-header">
          <h1 className="create-title">写文章</h1>
          <div className="header-actions">
            {/* 编辑器模式切换按钮 */}
            <button
              type="button"
              className={`mode-toggle ${editorMode === 'rich' ? 'mode-rich' : 'mode-markdown'}`}
              onClick={toggleEditorMode}
              title="点击切换编辑模式"
            >
              {editorMode === 'rich' ? '📝 富文本模式（点击切为 Markdown）' : '✨ Markdown 模式（点击切为富文本）'}
            </button>
            <div className="view-toggle">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`toggle-btn ${!showPreview ? 'active' : ''}`}
              >
                ✏️ 编辑
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`toggle-btn ${showPreview ? 'active' : ''}`}
              >
                👁️ 预览
              </button>
            </div>
          </div>
        </div>

        {error && <div className="create-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题"
              className="title-input"
            />
          </div>

          {!showPreview && (
            <>
              {/* 富文本模式工具栏 */}
              {editorMode === 'rich' && (
                <div className="toolbar">
                  <button type="button" onClick={() => execRich('bold')} className="tool-btn" title="加粗"><b>B</b></button>
                  <button type="button" onClick={() => execRich('italic')} className="tool-btn" title="斜体"><i>I</i></button>
                  <button type="button" onClick={() => execRich('underline')} className="tool-btn" title="下划线"><u>U</u></button>
                  <span className="tool-divider"></span>
                  <button type="button" onClick={() => execRich('formatBlock', 'H2')} className="tool-btn" title="标题">H</button>
                  <button type="button" onClick={() => execRich('insertUnorderedList')} className="tool-btn" title="无序列表">•</button>
                  <button type="button" onClick={() => execRich('insertOrderedList')} className="tool-btn" title="有序列表">1.</button>
                  <span className="tool-divider"></span>
                  <button type="button" onClick={insertRichLink} className="tool-btn" title="插入链接">🔗</button>
                  <button type="button" onClick={handleImageUpload} className="tool-btn tool-btn-image" title="插入图片">
                    🖼️ {uploadingImage ? '上传中...' : '图片'}
                  </button>
                  <span className="tool-divider"></span>
                  <button type="button" onClick={() => execRich('justifyLeft')} className="tool-btn" title="左对齐">⬅️</button>
                  <button type="button" onClick={() => execRich('justifyCenter')} className="tool-btn" title="居中">↔️</button>
                </div>
              )}

              {/* Markdown 模式工具栏 */}
              {editorMode === 'markdown' && (
                <div className="toolbar">
                  <button type="button" onClick={() => insertMarkdown('**', true, '粗体文字')} className="tool-btn" title="粗体"><b>B</b></button>
                  <button type="button" onClick={() => insertMarkdown('*', true, '斜体文字')} className="tool-btn" title="斜体"><i>I</i></button>
                  <span className="tool-divider"></span>
                  <button type="button" onClick={() => insertMarkdown('## ', false, '二级标题')} className="tool-btn" title="标题">H</button>
                  <button type="button" onClick={insertMarkdownListItem} className="tool-btn" title="列表">•</button>
                  <button type="button" onClick={() => insertMarkdown('`', true, 'code')} className="tool-btn" title="行内代码">{`</>`}</button>
                  <button type="button" onClick={insertMarkdownCodeBlock} className="tool-btn" title="代码块">{`{ }`}</button>
                  <span className="tool-divider"></span>
                  <button type="button" onClick={() => insertMarkdown('[链接](https://)', false, '')} className="tool-btn" title="链接">🔗</button>
                  <button type="button" onClick={handleImageUpload} className="tool-btn tool-btn-image" title="插入图片">
                    🖼️ {uploadingImage ? '上传中...' : '图片'}
                  </button>
                  <button type="button" onClick={() => insertMarkdown('> ', false, '引用文字')} className="tool-btn" title="引用">❝</button>
                </div>
              )}

              {/* 富文本编辑器 */}
              {editorMode === 'rich' && (
                <div className="form-group">
                  <label>内容 <span className="hint">（富文本 · 所见即所得）</span></label>
                  <div
                    ref={richEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={onRichInput}
                    placeholder="在这里开始写作...\n\n支持：加粗、斜体、标题、列表、链接、插入图片..."
                    className="rich-editor"
                  />
                </div>
              )}

              {/* Markdown 编辑器 */}
              {editorMode === 'markdown' && (
                <div className="form-group">
                  <label>内容 <span className="hint">（Markdown 语法）</span></label>
                  <textarea
                    ref={markdownTextareaRef}
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                    placeholder={`支持 Markdown 语法：\n\n# 一级标题\n## 二级标题\n\n**粗体** 和 *斜体*\n\n- 列表项 1\n- 列表项 2\n\n> 引用文字\n\n\`\`\`\n代码块\n\`\`\`\n\n[链接文字](https://example.com)\n\n![图片描述](图片URL)`}
                    rows={18}
                    className="blog-editor"
                  />
                </div>
              )}
            </>
          )}

          {/* 预览面板 */}
          {showPreview && (
            <div className="form-group">
              <label>预览</label>
              <div className="preview-panel">
                {previewContent ? (
                  editorMode === 'rich' ? (
                    <div className="rich-preview" dangerouslySetInnerHTML={{ __html: previewContent }} />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                  )
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

        {/* 隐藏的图片 file input */}
        <input
          ref={hiddenImageInput}
          type="file"
          accept="image/*"
          onChange={onImageSelected}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}

export default CreateBlog
