const express = require("express");
const authToken = require("../../middlewares/authToken");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/userModel");

router.post("/",  authToken, async(req, res) => {
    try{
        const { oldPassword, newPassword } = req.body;

        if(!oldPassword || !newPassword){
            return res.status(400).json({
                message: "Please provide all fields."
            });
        }

        const existingUser = await User.findById(req.user.id);

        if(!existingUser){
            return res.status(401).json({
                message: "User not found! This account not registered yet."
            });
        }

        if( newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword) ){
            return res.status(400).json({
                message: "Password must be at least 8 characters, at least one number, at least one capital letter, at least one small letter, and specific letter [^A-Za-z0-9]"
            });
        }

        if(oldPassword === newPassword){
            return res.status(400).json({
                message: "New password must be different from old password."
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, existingUser.password);

        if(!isMatch){
            return res.status(401).json({
                message: "current password is Invalid."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        existingUser.password = hashedPassword;
        await existingUser.save();

        res.status(201).json({
            message: "Password changed successfully!",
            user: req.user._id
        });

    } catch(err){
        res.status(500).json({
            error: err.message
        });
    }
});

module.exports = router;