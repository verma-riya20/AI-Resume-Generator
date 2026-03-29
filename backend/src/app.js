
const express=require('express')
const cookieParser=require('cookie-parser')
const cors=require('cors')
const app=express()
const allowedOrigins = [
    "http://localhost:5173",
    "https://ai-resume-generator-vert.vercel.app",
    "https://ai-resume-generator-ai.vercel.app"
]

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests and same-origin requests without Origin header.
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error("Not allowed by CORS"))
    },
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())

const authRouter=require('./routes/auth.routes')
const interviewRouter=require('./routes/interview.routes')
app.use("/api/auth",authRouter)
app.use("/api/interview",interviewRouter)

module.exports=app