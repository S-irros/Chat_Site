const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    text: { type: String, required: true },
    room: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ room: 1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
