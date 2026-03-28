import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-resume-generator-u8tb.onrender.com"

// Helper to get token from cookies
const getTokenFromCookies = () => {
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'token') return value
  }
  return null
}

const api=axios.create({
    baseURL: API_BASE_URL,
    withCredentials:true
})

// Add request interceptor to include token from localStorage
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('authToken')
  console.log("Interview API - Token from localStorage:", token ? "EXISTS" : "MISSING")
  
  // Fallback to cookies if localStorage is empty
  if (!token) {
    token = getTokenFromCookies()
    console.log("Interview API - Token from cookies:", token ? "EXISTS" : "MISSING")
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log("Interview API - Authorization header set")
  } else {
    console.warn("Interview API - No token found in localStorage or cookies!")
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

export const generateInterviewReport=async ({jobDescription,selfDescription,resumeFile})=>{
    const formData=new FormData()
    formData.append("jobDescription",jobDescription)
    formData.append("selfDescription",selfDescription)

    if (resumeFile instanceof File) {
      formData.append("resume",resumeFile)
    }

    const response=await api.post("/api/interview/",formData,{
        headers:{
            "Content-Type":"multipart/form-data"
        }
    })
    return response.data
}

export const getInterviewReportById=async(interviewId)=>{
    const response=await api.get(`/api/interview/report/${interviewId}`)
    return response.data
}

export const getAllInterviewReports=async ()=>{
    const response=await api.get("/api/interview/")
    return response.data
}

export const generateResumePdf=async({interviewReportId})=>{
   const response=await api.post(`/api/interview/resume/pdf/${interviewReportId}`,null,{
    responseType:"blob"
   })
   return response.data
}