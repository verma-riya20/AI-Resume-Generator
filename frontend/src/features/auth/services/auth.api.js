import axios from 'axios'
//to refrain from repeating same code
const api=axios.create({
    baseURL:"http://localhost:3000",
    withCredentials:true      //written to enable server to get the cookies
})
export async function register({username,email,password}){
  try {
     const response=await api.post('/api/auth/register',{
    username,email,password
   })
   return response.data
  } catch (error) {
    console.log(error)
  }
}
export async function login({email,password}){
     try {
     const response=await api.post('/api/auth/login',{
      email,password
   })
   return response.data
  } catch (error) {
    const message = error?.response?.data?.message || "Login failed"
    throw new Error(message)
  }
}

export async function logout(){
     try {
     const response=await api.get('/api/auth/logout')
   return response.data
  } catch (error) {
    console.log(error)
  }
}

export async function getMe(){
     try {
     const response=await api.get('/api/auth/get-me')
   return response.data
  } catch (error) {
    console.log(error)
  }
}