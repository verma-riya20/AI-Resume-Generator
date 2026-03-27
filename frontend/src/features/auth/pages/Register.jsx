import React, { useState } from 'react'
import '../auth.form.scss'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import BackHomeArrow from '../../../components/BackHomeArrow'


function Register() {
  const navigate=useNavigate()
  const { loading, handleRegister } = useAuth()
  const [username, setusername] = useState("")
  const [email, setemail] = useState("")
  const [password, setpassword] = useState("")
const handleSubmit=async(e)=>{
    e.preventDefault()
    try {
      await handleRegister({ username, email, password })
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
          <h2>Create Your Interview Intelligence Profile</h2>
          <p>
            Join the platform and unlock resume optimization, interview analytics,
            and role-specific strategy in one streamlined workspace.
          </p>
        </aside>

        <div className="form-container">
          <p className="form-kicker">Get Started</p>
          <h1>Register</h1>
          <p className="form-subtitle">Create your account to begin.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input onChange={(e)=>{setusername(e.target.value)}} type="text" id="username" name="username" placeholder="Enter your username"/>
            </div>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input onChange={(e)=>{setemail(e.target.value)}} type="email" id="email" name="email" placeholder="Enter email address"/>
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input onChange={(e)=>{setpassword(e.target.value)}} type="password" id="password" name="password" placeholder="Create a strong password"/>
            </div>
            <button className="button primary-button">Create Account</button>
          </form>

          <p className="auth-switch">Already have an account? <Link to={"/login"}>Login</Link></p>
        </div>
      </section>
    </main>
  )
}

export default Register