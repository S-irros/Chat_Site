// # Controller for message-related operations

// # Clear Redis cache for a specific room
// async function clearRoomCache(redisClient, room) {
//   try {
//     const keys = await redisClient.keys(`messages:${room}*`);
//     if (keys.length > 0) {
//       await redisClient.del(keys);
//       console.log(`Cleared cache for room ${room}`);
//     }
//   } catch (err) {
//     console.error("Error clearing Redis cache: ", err.message);
//   }
// }

// # Fetch messages for a specific room
exports.getMessages = async (req, res, io) => {
  try {
    const room = req.query.room;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const cacheKey = `messages:${room}:skip${skip}:limit${limit}`;

    if (!room) return res.status(400).json({ message: "Room is required" });

    // const cachedMessages = await redisClient.get(cacheKey);
    if (cachedMessages) {
      return res.status(200).json(JSON.parse(cachedMessages));
    }

    const messages = await req.model.Message.find({ room })
      .populate("userID", "name")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (messages.length > 0) {
      const formattedMessages = messages.map((msg) => ({
        id: msg._id,
        text: msg.text,
        userName: msg.userID.name,
        userID: msg.userID._id.toString(),
        time: msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));

      // await redisClient.setEx(cacheKey, 3600, JSON.stringify(formattedMessages));
      res.status(200).json(formattedMessages);
    } else {
      return res.status(200).json([]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// # Update a message
exports.updateMessage = async (req, res, io) => {
  try {
    const msgID = req.params.id;
    const userID = req.user.id;
    const { text } = req.body;
    const { room } = req.query;

    if (!userID || typeof text !== "string" || !text.trim() || !room) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    const user = await req.model.User.findById(userID);
    if (!user) {
      io.to(room).emit("system messages", "Unauthorized to update this message");
      return res.status(404).json({ message: "User not found" });
    }

    const updatedMessage = await req.model.Message.findOneAndUpdate(
      { _id: msgID, userID: userID, room: room },
      { text: text },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found or not yours" });
    }

    io.to(room).emit("update message", {
      id: updatedMessage._id,
      text: updatedMessage.text,
      userID: updatedMessage.userID,
      userName: user ? user.name : "Unknown",
    });
    // await clearRoomCache(redisClient, room);
    res.status(200).json(updatedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// # Delete a message
exports.deleteMessage = async (req, res, io) => {
  try {
    const msgID = req.params.id;
    const room = req.query.room;
    const userID = req.user.id;
    const userRole = req.user.role;

    if (!userID || !room) {
      return res.status(400).json({ message: "Please provide userID and room" });
    }

    const msg = await req.model.Message.findById(msgID);
    if (!msg) {
      return res.status(404).json({ error: "No message found to delete." });
    }

    const user = await req.model.User.findById(userID);
    if (!user || !user.rooms.includes(room)) {
      io.to(room).emit("system messages", "Unauthorized to delete this message");
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    if (userRole === "Admin" || msg.userID.toString() === userID) {
      const deletedMessage = await req.model.Message.findByIdAndDelete(msgID);
      if (deletedMessage) {
        io.to(room).emit("delete message", {
          userID: deletedMessage.userID,
          msgID: deletedMessage._id,
          room: deletedMessage.room,
        });
        io.to(room).emit("system messages", `Message deleted successfully ${userRole === "Admin" ? " by Admin." : "!"}`);
        // await clearRoomCache(redisClient, room);
        return res.status(200).json({ message: `Message deleted successfully ${userRole === "Admin" ? " by Admin." : "!"}` });
      } else {
        return res.status(404).json({ error: "Message not found or already deleted" });
      }
    } else {
      io.to(room).emit("system messages", "You are not authorized to delete this message")
      return res.status(403).json({ message: "You are not authorized to delete this message" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};