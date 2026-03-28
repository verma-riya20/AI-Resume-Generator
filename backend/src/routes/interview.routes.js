const express=require('express')
const authMiddleware=require('../middlewares/auth.middleware')
const interviewController=require("../controllers/interview.controller")
const {uploadResume}=require('../middlewares/multer.middleware')


const interviewRouter=express.Router();

interviewRouter.post('/',authMiddleware.authUser,uploadResume,interviewController.generateInterviewReportController)

interviewRouter.get("/report/:interviewId",authMiddleware.authUser,interviewController.getInterviewReportByIdController)

interviewRouter.get("/",authMiddleware.authUser,interviewController.getAllInterviewReportController)

interviewRouter.post('/resume/pdf/:interviewReportId',authMiddleware.authUser,interviewController.generateResumePdfController)

module.exports=interviewRouter