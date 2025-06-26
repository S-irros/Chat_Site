const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, index: true },
  email: { type: String, unique: true },
  password: { type: String },
  gender: { type: Number, enum: [1, 2], default: 1 },
  phone: { type: String },
  rooms: { type: [String], default: [] },
  role: { type: String, enum: ["User", "Admin"], default: "User" },
  otp: { type: String },
  otpExpires: { type: Date },
  isOnline: { type: Boolean, default: false },
  isConfirmed: { type: Boolean, default: false },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
