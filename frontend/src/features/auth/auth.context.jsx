import { createContext,useState ,useEffect} from "react";
import { getMe } from "./services/auth.api";

export const AuthContext=createContext()

export const AuthProvider=({children})=>{
     const [user, setuser] = useState(null)
     const [loading, setloading] = useState(true)
  
    useEffect(()=>{
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
            setuser(data?.user ?? null)
         } catch (error) {
            setuser(null)
            localStorage.removeItem('authToken')
         } finally {
            setloading(false)
         }
         }
         getAndsetUser()
    },[])


     return(
        <AuthContext.Provider value={{user,setuser,loading,setloading}}>
            {children}
        </AuthContext.Provider>
     )
}