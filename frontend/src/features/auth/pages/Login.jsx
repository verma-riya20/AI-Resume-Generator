import React, { useState } from 'react'
import '../auth.form.scss'
import { Link } from 'react-router'
import {useAuth} from '../hooks/useAuth'
import { useNavigate } from 'react-router'
import BackHomeArrow from '../../../components/BackHomeArrow'

function Login() {
  const {loading,handleLogin}=useAuth()
  const [email, setemail] = useState("")
  const [password, setpassword] = useState("")
  const navigate=useNavigate()



const handleSubmit=async(e)=>{
    e.preventDefault()
    try {
      await handleLogin({email,password})
      navigate('/dashboard')
    } catch (error) {
      alert(error.message)
    }
}
if(loading){
  return (
    <main className="auth-page">
      <p className="loading-text">Loading...</p>
    </main>
  )
}

  return (
    <main className="auth-page">
      <BackHomeArrow />
      <section className="auth-shell" aria-label="Authentication">
        <aside className="auth-copy">
          <Link to="/" className="brand-link">AceMatchAI</Link>
          <p className="copy-tag">AI-Powered Career Advantage</p>
          <h2>Step Back Into Your Interview Command Center</h2>
          <p>
            Continue from where you left off and keep sharpening your profile with high-stakes,
            role-aligned interview insights.
          </p>
        </aside>

        <div className="form-container">
          <p className="form-kicker">Welcome Back</p>
          <h1>Login</h1>
          <p className="form-subtitle">Continue your interview prep journey.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input onChange={(e)=>{setemail(e.target.value)}} type="email" id="email" name="email" placeholder="Enter email address"/>
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input onChange={(e)=>{setpassword(e.target.value)}} type="password" id="password" name="password" placeholder="Enter password"/>
            </div>
            <button className="button primary-button">Login</button>
          </form>

          <p className="auth-switch">New here? <Link to={"/register"}>Create account</Link></p>
        </div>
      </section>
    </main>
  )
}

export default Login