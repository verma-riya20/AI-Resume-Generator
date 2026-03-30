import { createContext,useState ,useEffect} from "react";
import { getMe } from "./services/auth.api";

export const AuthContext=createContext()

export const AuthProvider=({children})=>{
     const [user, setuser] = useState(null)
     const [loading, setloading] = useState(true)
  
    useEffect(()=>{
         let isMounted = true
         const safetyTimer = setTimeout(() => {
            if (isMounted) {
               setloading(false)
            }
         }, 13000)

         const getAndsetUser=async()=>{
         try {
            // Restore token from localStorage if it exists
            const token = localStorage.getItem('authToken')
            if(token){
              // Token will be automatically sent via interceptor
            }
                  const data=await Promise.race([
                     getMe(),
                     new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth check timed out. Please try again.')), 12000)
                     )
                  ])
            if (isMounted) {
               setuser(data?.user ?? null)
            }
         } catch (error) {
            if (isMounted) {
               setuser(null)
            }
            localStorage.removeItem('authToken')
         } finally {
            clearTimeout(safetyTimer)
            if (isMounted) {
               setloading(false)
            }
         }
         }
         getAndsetUser()

         return () => {
            isMounted = false
            clearTimeout(safetyTimer)
         }
    },[])


     return(
        <AuthContext.Provider value={{user,setuser,loading,setloading}}>
            {children}
        </AuthContext.Provider>
     )
}