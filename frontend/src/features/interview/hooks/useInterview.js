import { getAllInterviewReports,generateInterviewReport,getInterviewReportById ,generateResumePdf} from "../services/interview.api";
import { useContext } from "react";
import { InterviewContext } from "../interview.context";

export const useInterview=()=>{
    const context=useContext(InterviewContext)

    if(!context){
        throw new Error("useInterview must be used within an InterviewProvider")
    }
    const {loading,setLoading,report,setReport,reports,setreports}=context

    const generateReport=async({jobDescription,selfDescription,resumeFile})=>{
        setLoading(true)
        try {
            const response=await generateInterviewReport({jobDescription,selfDescription,resumeFile})
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            const errorMsg = error?.response?.data?.message || error.message || "Failed to generate report"
            console.error("Error generating interview report:", errorMsg)
            throw new Error(errorMsg)
        }finally{
            setLoading(false)
        }
    }

   const getReportById=async(interviewId)=>{
    setLoading(true)
    try{
       const response=await getInterviewReportById(interviewId)
       setReport(response.interviewReport)
         return response.interviewReport
    }catch(error){
      console.log("error",error)
        throw error
    }finally{
        setLoading(false)
    }
   }

   const getReports=async()=>{
    setLoading(true)
    try {
        const response=await getAllInterviewReports()
        setreports(response.interviewReports)
    } catch (error) {
        console.log("error",error)
    }finally{
        setLoading(false)
    }
   }
   

   //generate pdf
   const getResumePdf=async(interviewReportId)=>{
    setLoading(true)
    let response=null
    try{
        response=await generateResumePdf({interviewReportId})
        const url=window.URL.createObjectURL(new Blob([response],{type:"application/pdf"}))
        const link=document.createElement("a")
        link.href=url
        link.setAttribute("download",`resume_${interviewReportId}.pdf`)
        document.body.appendChild(link)
        link.click()
    }catch(err){
        console.log(err)
    }finally{
        setLoading(false)
    }
   }

   return {loading,report,reports,generateReport,getReportById,getReports,getResumePdf}
}