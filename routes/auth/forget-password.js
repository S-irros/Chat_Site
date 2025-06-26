const express = require("express");
const User = require("../../models/userModel");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
require("dotenv").config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide your email.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(401).json({
        message: "Make sure this email is registered.",
      });
    }

    if (existingUser.isConfirmed === false) {
      return res.status(403).json({
        message: "Please activate your account first",
      });
    }

    if (existingUser.isDeleted === true) {
      return res.status(403).json({
        message: "Your account has been deleted.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    existingUser.otp = otp;
    existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
    await existingUser.save();

    const mailOptions = {
      from: EMAIL_USER,
      to: existingUser.email,
      subject: "Reset your password.",
      text: `Your otp is ${otp}. It will expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    try {
      await twilioClient.messages.create({
        body: `Your OTP is ${otp}. It will expire in 10 minutes.`,
        from: TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${existingUser.phone}`,
      });
    } catch (twilioErr) {
      console.error("Twilio Error:", twilioErr.message);
    }

    res.status(201).json({
      message: "OTP sent to email and WhatsApp",
      userID: existingUser._id,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { userID, OTP } = req.body;

    if(!userID || !OTP){
        return res.status(400).json({
            message: "Please provide userID and OTP."
        });
    }

    if(OTP.length !== 6 || !/\d/.test(OTP)){
        return res.status(400).json({
            message: "OTP must be 6 numbers and not allowed for other characters."
        });
    }

    const existingUser = await User.findById(userID);

     if(!existingUser){
        return res.status(401).json({
            message: "User not found!"
        })
     }

     if(existingUser.otp !== OTP || existingUser.otpExpires < Date.now()){
        return res.status(400).json({
            message: "Invalid or expired OTP."
        });
     }

     existingUser.otp = undefined;
     existingUser.otpExpires = undefined;

     await existingUser.save();

     res.status(201).json({
        message: "OTP verified successfully."
     })
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

router.post("/reset-password", async(req, res) => {
    try{
        const { userID, newPassword } = req.body;

        if(!userID || !newPassword){
            return res.status(400).json({
                message: "Please provide all fields."
            });
        }

        const existingUser = await User.findById(userID);

        if(!existingUser){
            return res.status(401).json({
                message: "User not found ! Make sure this user is registered."
            });
        }

        if( newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword) ){
            return res.status(400).json({
                message: "Password must be at least 8 characters, at least one number, at least one capital letter, at least one small letter, and specific letter [^A-Za-z0-9]"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        existingUser.password = hashedPassword;
        await existingUser.save();

        res.status(201).json({
            message: "Password reseted successfully."
        });

    } catch (err) {
        res.status(500).json({
          error: err.message,
        });
    }
});

module.exports = router;