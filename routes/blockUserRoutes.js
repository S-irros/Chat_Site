const express = require("express");
const authToken = require("../middlewares/authToken");
const User = require("../models/userModel");
const router = express.Router();

router.post("/", authToken, async (req, res) => {
  try {
    const { userID } = req.body;

    if(!userID){
        return res.status(400).json({ message: "Please provide userID" });
    }

    const existingUser = await User.findById( userID );

    if(!existingUser){
        return res.status(404).json({ message: "User not found!" });
    }

    if(existingUser.role === 'Admin'){
        return res.status(401).json({
            message: "You cannot block an admin, only Owners can do it."
        });
    }

    if(existingUser.isBlocked === true){
        return res.status(400).json({ message: "User already blocked!" });
    }

    existingUser.isBlocked = true;
    existingUser.isOnline = false;
    await existingUser.save();

    res.status(201).json({
        message: "User blocked successfully!"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;