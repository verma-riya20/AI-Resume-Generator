import { createContext,useState ,useEffect} from "react";
import { getMe } from "./services/auth.api";

export const AuthContext=createContext()

export const AuthProvider=({children})=>{
     const [user, setuser] = useState(null)
     const [loading, setloading] = useState(true)
  
    useEffect(()=>{
         const getAndsetUser=async()=>{
         try {
            const data=await getMe()
            setuser(data?.user ?? null)
         } catch (error) {
            setuser(null)
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