const {Router}=require('express')
const authRouter=Router();
const authController=require('../controllers/auth.controllers')
const authMiddleware=require('../middlewares/auth.middleware')

authRouter.post('/register',authController.registerUserController)
authRouter.post('/login',authController.loginUserController)
authRouter.get('/logout',authController.logoutUserController)
//to get all users
authRouter.get('/get-me',authMiddleware.authUser,authController.getMeController)

module.exports=authRouter