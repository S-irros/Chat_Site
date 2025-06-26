const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("../../models/userModel");
const nodemailer = require("nodemailer");
require("dotenv").config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const BASE_URL = process.env.BASE_URL;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

router.post("/", async (req, res) => {
  try {
    const { username, email, password, name, phone, gender } = req.body;

    if (!username || !name || !email || !password || !phone || !gender) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      return res.status(400).json({
        message: "Username already exists.",
      });
    }

    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists.",
      });
    }

    const existingPhone = await User.findOne({ phone });

    if (existingPhone) {
      return res.status(400).json({
        message: "Phone already exists.",
      });
    }

    if (
      password.length < 8 ||
      !/\d/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, at least one number, at least one capital letter, at least one small letter, and specific letter [^A-Za-z0-9]",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      name,
      email,
      password: hashedPassword,
      phone,
      gender: gender === "male" ? 1 : 2,
      isConfirmed: false,
    });
    await newUser.save();

    const activationLink = `${BASE_URL}/api/auth/register/activate?username=${newUser.username}`;

    const mailOptions = {
      from: EMAIL_USER,
      to: newUser.email,
      subject: "Activate your account",
      html: `<p>Please click the link below to activate your account:</p><a href="${activationLink}">Activate account</a>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message:
        "User registered successfully, please check your email to activate your account",
      userID: newUser._id,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

router.get("/activate", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: "Token is required" });
    }

    const existingUser = await User.findOne({ username });

    if(!existingUser){
      return res.status(401).json({
        message: "This email doesn't registered yet. Make sure this email is registered."
      });
    }

    if(existingUser.isConfirmed === true){
      return res.status(400).json({
        message: "Account already confirmed."
      });
    }

    existingUser.isConfirmed = true;
    await existingUser.save();

    res.sendFile(path.join(__dirname, "../../public/activation.html"));
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;
