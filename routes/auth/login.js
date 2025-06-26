const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/", async(req, res) => {
    try{
        const { username, password } = req.body;

        if(!username || !password){
            return res.status(400).json({
                message: "Please provide all fields."
            });
        }

        const existingUser = await User.findOne({ username });
        if(!existingUser){
            return res.status(401).json({
                message: "Make sure this email is registered."
            });
        }

        if(existingUser.isDeleted === true){
            return res.status(403).json({
                message: "Your account has been deleted."
            });
        }

        if(existingUser.isConfirmed === false){
            return res.status(403).json({
                message: "Please activate your account first"
            });
        }

        if(existingUser.isBlocked === true){
            return res.status(403).json({
                message: "Your account is blocked"
            });
        }

        const isMatch = await bcrypt.compare(password, existingUser.password);

        if(!isMatch){
            return res.status(401).json({
                message: "Invalid Password!"
            });
        }

        const token = jwt.sign(
            {
                id: existingUser._id,
                username: existingUser.username,
                role: existingUser.role
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        existingUser.isOnline = true;
        await existingUser.save();

        res.status(201).json({
            message: `User logged in successfully! Welcome ${existingUser.name}!`,
            token: token,
            userID: existingUser._id,
            username: existingUser.username
        });

    } catch(err){
        res.status(500).json({
            error: err.message
        });
    }
});

module.exports = router;