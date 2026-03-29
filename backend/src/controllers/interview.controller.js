const pdfParse=require("pdf-parse")
const { interviewReportModel } = require("../models/interviewReport.model")
const  {generateInterviewReport,generateResumePdf} = require('../services/ai.services')

async function extractResumeText(fileBuffer) {
   const errors = []

   // Strategy 1: pdf-parse v2 class API with Buffer input.
   try {
      const parser = new pdfParse.PDFParse(fileBuffer)
      const result = await parser.getText()
      if (typeof result?.text === 'string' && result.text.trim()) {
         return result.text
      }
   } catch (error) {
      errors.push(error)
   }

   // Strategy 2: pdf-parse v2 class API with Uint8Array input.
   try {
      const parser = new pdfParse.PDFParse(Uint8Array.from(fileBuffer))
      const result = await parser.getText()
      if (typeof result?.text === 'string' && result.text.trim()) {
         return result.text
      }
   } catch (error) {
      errors.push(error)
   }

   // Strategy 3: backward-compatible function API when available.
   try {
      if (typeof pdfParse === 'function') {
         const result = await pdfParse(fileBuffer)
         if (typeof result?.text === 'string' && result.text.trim()) {
            return result.text
         }
      }
   } catch (error) {
      errors.push(error)
   }

   const firstError = errors[0]
   throw firstError || new Error('Unable to parse resume PDF text.')
}

function deriveTitle(jobDescription = '') {
   if (!jobDescription || typeof jobDescription !== 'string') {
      return 'Interview Preparation Report'
   }

   // Use the first meaningful line as a practical fallback title.
   const firstMeaningfulLine = jobDescription
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

   if (!firstMeaningfulLine) {
      return 'Interview Preparation Report'
   }

   return firstMeaningfulLine.length > 100
      ? `${firstMeaningfulLine.slice(0, 97)}...`
      : firstMeaningfulLine
}

async function generateInterviewReportController(req,res){
   try {
       const resumeFile=req.file
       const {selfDescription,jobDescription}=req.body
   let resumeParsingFailed = false

       if (!jobDescription || !jobDescription.trim()) {
          return res.status(400).json({ message: "Job description is required" })
       }

       if (!resumeFile && (!selfDescription || !selfDescription.trim())) {
          return res.status(400).json({ message: "Either resume file or self description is required" })
       }

       let resumeText = ''
       if (resumeFile) {
          try {
             resumeText = await extractResumeText(resumeFile.buffer)
          } catch (parseError) {
             // Continue generation with available inputs (self-description / job description)
             // when PDF text extraction fails for specific PDF structures.
             resumeText = ''
             resumeParsingFailed = true
          }
       }

       const interviewReportByAi=await generateInterviewReport({
        resume:resumeText,
        selfDescription:(selfDescription || '').trim(),
        jobDescription:jobDescription.trim()
       })

       if (!interviewReportByAi || typeof interviewReportByAi.matchScore !== "number") {
        return res.status(502).json({ message: "AI returned incomplete report. Please retry." })
       }

       const safeTitle =
          typeof interviewReportByAi.title === 'string' && interviewReportByAi.title.trim()
             ? interviewReportByAi.title.trim()
             : deriveTitle(jobDescription)

       const interviewReport=await interviewReportModel.create({
        user:req.user.id,
          resume:resumeText,
          selfDescription:(selfDescription || '').trim(),
          jobDescription:jobDescription.trim(),
        ...interviewReportByAi,
        title: safeTitle
       })

       res.status(201).json({
        message: resumeParsingFailed
           ? "Interview report generated, but resume text could not be extracted from this PDF."
           : "Interview Report Generated Successfully",
        interviewReport,
        resumeParsingFailed
       })
   } catch (error) {
       console.error('Interview Generation Error:', error)

         if (error?.isGeminiError) {
           const statusCode = Number(error?.statusCode) || 503
           return res.status(statusCode).json({
             message: error.message
           })
         }

         if (error?.statusCode && Number.isFinite(Number(error.statusCode))) {
           return res.status(Number(error.statusCode)).json({ message: error.message })
         }

       res.status(500).json({ 
           message: error?.message || "Failed to generate interview report. Please try again." 
       })
   }
}

async function getInterviewReportByIdController(req,res) {
   const {interviewId}=req.params
   const interviewReport=await interviewReportModel.findOne({_id:interviewId,user:req.user.id})
   if(!interviewReport){
      return res.status(404).json({
         message:"Interview report not found."
      })
   }
   res.status(200).json({
      message:"Interview report fetched successfully",
      interviewReport
   })
}

async function getAllInterviewReportController(req,res){
      const interviewReportsRaw = await interviewReportModel
         .find({ user: req.user.id })
         .sort({ createdAt: -1 })
         .select("title jobDescription matchScore createdAt")

      const interviewReports = interviewReportsRaw.map((report) => {
         const title = typeof report.title === 'string' && report.title.trim()
            ? report.title.trim()
            : deriveTitle(report.jobDescription)

         return {
            _id: report._id,
            title,
            matchScore: report.matchScore,
            createdAt: report.createdAt
         }
      })

    res.status(200).json({
      message:"Interview reports fetched successfully...",
      interviewReports
    })
   }

   /**for resume pdf generation */

   async function generateResumePdfController(req,res){
      try {
          const {interviewReportId}=req.params
          const interviewReport=await interviewReportModel.findOne({
             _id:interviewReportId,
             user:req.user.id
          })
          if(!interviewReport){
            return res.status(404).json({
               message:"Interview report not found."
            })
          }

          const {resume,selfDescription,jobDescription}=interviewReport
          const pdfBuffer=await generateResumePdf({resume,selfDescription,jobDescription})
          res.set({
            "Content-Type":"application/pdf",
            "Content-Disposition":`attachment; filename=resume_${interviewReportId}.pdf`
          })
          res.send(pdfBuffer)
         } catch (error) {
               console.error('Resume PDF Generation Error:', error)

               if (error?.isGeminiError) {
                  const statusCode = Number(error?.statusCode) || 503
                  return res.status(statusCode).json({
                     message: error.message
                  })
               }

               if (error?.statusCode && Number.isFinite(Number(error.statusCode))) {
                  return res.status(Number(error.statusCode)).json({ message: error.message })
               }

               return res.status(500).json({
                  message: error?.message || 'Failed to generate resume PDF. Please try again.'
               })
         }
   }

module.exports={generateInterviewReportController,getInterviewReportByIdController,getAllInterviewReportController,generateResumePdfController}