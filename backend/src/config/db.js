const mongoose=require('mongoose')

async  function connectDB(){
    try {
        mongoose.connect(process.env.MongoDB_URI)
        console.log("connected ")
    } catch (error) {
        console.log("error",error)
    }
}
module.exports=connectDB