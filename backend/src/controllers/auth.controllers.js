const userModel=require('../models/user.model')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const blacklistModel=require('../models/blacklist.model')
async function registerUserController(req,res){
    const {username,email,password}=req.body
    if(!username || !email || !password){
        return res.status(400).json({message:"Please provide email,passowrd and username"})
    }

    const isUserExist=await userModel.findOne({
        $or:[{username},{email}]
    })
    if(isUserExist){
        return res.status(400).json({
            message:"Account already exist with this email address or username"
        })
    }

    const hash=await bcrypt.hash(password,10)
    const user=await userModel.create({
        username,email,
        password:hash
    })
    const token=jwt.sign(
        {_id:user._id,username:user.username},
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )
    res.cookie("token",token,{
        httpOnly:true,
        secure: process.env.NODE_ENV==="production",
        sameSite:"lax",
        maxAge: 24*60*60*1000
    })
    return res.status(201).json({
        message:"user registered successfully",
        token,
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}

async function loginUserController(req,res){
    const {email,password}=req.body;
    const user=await userModel.findOne({email})
    if(!user){
        return res.status(400).json({message:"Email or password invalid"})
    }
   const isPasswordValid=await bcrypt.compare(password,user.password)
   if(!isPasswordValid){
    return res.status(400).json({message:"Email or Password is invalid"})
   }
    const token=jwt.sign(
        {_id:user._id,username:user.username},
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )
    res.cookie("token",token,{
        httpOnly:true,
        secure: process.env.NODE_ENV==="production",
        sameSite:"lax",
        maxAge: 24*60*60*1000
    })
    return res.status(201).json({
        message:"user logged in successfully",
        token,
        user:{
            id:user._id,
            username:user.username,
            email:user.email,
        }
    })

   
}

async function logoutUserController(req,res){
    const token=req.cookies.token
    if(token){
       await blacklistModel.create({token})
    }
    res.clearCookie('token')
    return res.status(200).json({message:"Logged out successfully"})
}

async function getMeController(req,res){
      const user=await userModel.findById(req.user._id)
      
      if(!user){
        return res.status(404).json({message:"User not found"})
      }

      res.status(200).json({
        message:"User details fetched succesfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
      })
}

module.exports={registerUserController,loginUserController,logoutUserController,getMeController}