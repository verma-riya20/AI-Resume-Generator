import React, { useState } from 'react'
import '../auth.form.scss'
import { Link } from 'react-router'
import {useAuth} from '../hooks/useAuth'
import { useNavigate } from 'react-router'

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
  return (<main className="auth-page"><h1>Loading......</h1></main>)
}

  return (
    <main className="auth-page">
      <div className="form-container">
          <h1>Login</h1>
        <form onSubmit={handleSubmit}>
            <div className="input-group">
               <label htmlFor="email">Email</label>
               <input onChange={(e)=>{setemail(e.target.value)}} type="email" id="email" name="email" placeholder="Enter email address"/>
            </div>
            <div className="input-group">
               <label htmlFor="password">Password</label>
               <input onChange={(e)=>{setpassword(e.target.value)}} type="password" id="password" name="password" placeholder="Enter email password"/>
            </div>
            <button className="button primary-button">Login</button>
        </form>
         <p>Create an account?<Link to={"/register"}>Register</Link></p>
      </div>
    </main>
  )
}

export default Login