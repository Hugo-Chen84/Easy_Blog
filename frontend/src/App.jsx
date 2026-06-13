import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import BlogDetail from './pages/BlogDetail'
import CreateBlog from './pages/CreateBlog'
import Navbar from './components/Navbar'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // 从 localStorage 恢复用户信息
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        // ignore
      }
    }
    // 然后从后端刷新用户信息（确保 isAdmin 等字段是最新的）
    if (token) {
      axios
        .get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
          const freshUser = {
            id: String(res.data.id),
            username: res.data.username,
            avatar: res.data.avatar,
            isAdmin: !!res.data.isAdmin
          }
          localStorage.setItem('user', JSON.stringify(freshUser))
          setUser(freshUser)
        })
        .catch(() => {
          // token 失效，清除本地信息
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          setUser(null)
        })
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar user={user} setUser={setUser} />
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/blog/:id" element={<BlogDetail user={user} />} />
          <Route path="/create" element={user ? <CreateBlog user={user} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
