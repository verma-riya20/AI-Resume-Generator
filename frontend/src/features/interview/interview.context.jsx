import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth/auth.context";

export const InterviewContext=createContext()

export const InterviewProvider=({children})=>{
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState(null)
    const [reports, setreports] = useState([])
    const { user } = useContext(AuthContext)

    useEffect(() => {
        // Clear interview state when auth user changes to avoid stale cross-user UI.
        setReport(null)
        setreports([])
    }, [user?._id])

    return(
        <InterviewContext.Provider value={{loading,setLoading,report,setReport,reports,setreports}}>
            {children}
        </InterviewContext.Provider>
    )
}