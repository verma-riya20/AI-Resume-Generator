const multer=require('multer')

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{
        fileSize:3*1024*1024  //3mb
    },
    fileFilter:(req,file,cb)=>{
        const isPdfMime=file?.mimetype==="application/pdf"
        const isPdfName=typeof file?.originalname==="string" && file.originalname.toLowerCase().endsWith('.pdf')

        if(isPdfMime && isPdfName){
            return cb(null,true)
        }

        return cb(new Error("Only PDF resumes are supported. Please upload a .pdf file."))
    }
})

const uploadResume=(req,res,next)=>{
    upload.single("resume")(req,res,(err)=>{
        if(!err){
            return next()
        }

        if(err instanceof multer.MulterError && err.code==="LIMIT_FILE_SIZE"){
            return res.status(400).json({message:"Resume file size must be 3MB or less."})
        }

        return res.status(400).json({message:err.message || "Invalid resume upload."})
    })
}

module.exports={uploadResume}