const express = require("express");
const authToken = require("../../middlewares/authToken");
const User = require("../../models/userModel");
const router = express.Router();

router.delete("/", authToken, async (req ,res) => {
    try {
        const userID = req.user.id;

        const existingUser = await User.findById( userID );
        if(!existingUser){
            return res.status(401).json({
                message: 'User not found!'
            });
        }

        if(existingUser.isDeleted === true){
            return res.status(403).json({
                message: "Your account has been already deleted."
            });
        }

        if(existingUser.isBlocked === true){
            return res.status(403).json({
                message: "Your account is blocked"
            });
        }

        existingUser.isDeleted = true;
        existingUser.isOnline = false;
        existingUser.isConfirmed = false;
        existingUser.status = 'Inactive';

        await existingUser.save();

        res.status(201).json({
            message: 'account deleted successfully!'
        });

    } catch(err){
        res.status(500).json({
            error: err.message
        });
    }
});

module.exports = router;