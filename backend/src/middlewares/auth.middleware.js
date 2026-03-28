const jwt=require('jsonwebtoken')
const blacklistModel=require('../models/blacklist.model')


async function authUser(req,res,next){
    // Try to get token from cookies first
    let token=req.cookies.token
    
    // If no cookie token, try Authorization header
    if(!token){
        const authHeader=req.headers.authorization
        if(authHeader && authHeader.startsWith('Bearer ')){
            token=authHeader.slice(7)
        }
    }
    
    if(!token){
        return res.status(401).json({message:"No token found"})
    }
    
    const isTokenBlacklisted=await blacklistModel.findOne({token})
    if(isTokenBlacklisted){
        return res.status(401).json({message:"Token is invalid"})
    }

    try {
         const decoded=jwt.verify(token,process.env.JWT_SECRET)
         req.user=decoded
         next()
    } catch (error) {
        return res.status(401).json({message:"Invalid token"})
    }
   
}

module.exports={authUser}