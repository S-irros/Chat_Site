const express = require("express");
const mongoose = require("./db/connect");
const { Server } = require("socket.io");
const http = require("http");
require("dotenv").config();
const Message = require("./models/messageModel");
const User = require("./models/userModel");
const registerRoutes = require("./routes/auth/signup");
const loginRoutes = require("./routes/auth/login");
const changePasswordRoutes = require("./routes/auth/change-password");
const forgetPasswordRoutes = require("./routes/auth/forget-password");
const deleteAccountRoutes = require("./routes/auth/delete-account");
const blockUserRoutes = require("./routes/blockUserRoutes");
const path = require("path");
const redis = require("redis");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

// ✅ Redis setup
const redisClient = redis.createClient({
  url: "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error(`Redis error: ${err.message}`);
});

redisClient.connect().then(() => {
  console.log("Connected to Redis successfully");
});

// ✅ pass redisClient to io
io.redisClient = redisClient;

// ✅ pass redisClient to message routes
const messageRoutes = require("./routes/messageRoutes"); // بعد redisClient

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use((req, res, next) => {
  req.model = { Message, User };
  next();
});

app.use("/api/messages", messageRoutes(io, redisClient));
app.use("/api/auth/register", registerRoutes);
app.use("/api/auth/login", loginRoutes);
app.use("/api/auth/change-password", changePasswordRoutes);
app.use("/api/auth/forget-password", forgetPasswordRoutes);
app.use("/api/delete-account", deleteAccountRoutes);
app.use("/api/block-user", blockUserRoutes);

const PORT2 = process.env.PORT2;

app.get("/", async (req, res) => {
  try {
    res.sendFile(__dirname + "/./public/index.html");
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// ✅ socket.io logic
io.on("connection", async (socket) => {
  const redisClient = io.redisClient;

  try {
    socket.on("join room", async ({ userName, room }) => {
      try {
        let user = await User.findOne({ username: userName });
        let userID;

        if (!user.rooms?.includes(room)) {
          user.rooms.push(room);
          await user.save();
        }
        userID = user._id;

        socket.data = { userName, userID, user };
        user.isOnline = true;

        socket.join(room);
        socket.emit("join room", { userID });
        socket.broadcast
          .to(room)
          .emit("system messages", `${userName} joined the chat`);
      } catch (err) {
        console.error("error: ", err);
      }
    });

    socket.on("chat message", async ({ text, room, userName, userID }) => {
      if (!room) {
        socket.emit("system messages", "Room is required to send a message.");
        return;
      }

      const user = await User.findById(userID);

      if (user) {
        const msg = new Message({
          text: text,
          userID: userID,
          room: room,
        });
        const savedMsg = await msg.save();
        const populatedMsg = await savedMsg.populate("userID", "name");

        const keys = await redisClient.keys(`messages:${room}:*`);
        for (const key of keys) {
          await redisClient.del(key);
        }

        io.to(room).emit("chat message", {
          id: populatedMsg._id,
          text: populatedMsg.text,
          userName: populatedMsg.userID.name,
          userID: populatedMsg.userID._id.toString(),
          time: populatedMsg.createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      } else {
        console.log("user not found!");
        socket.broadcast
          .to(room)
          .emit("system messages", "unauthorized to send messages.");
      }
    });

    socket.on("leave room", async ({ userName, room, userID }) => {
      try {
        const user = await User.findById(userID);

        if (user) {
          socket.leave(room);
          socket.broadcast
            .to(room)
            .emit("system messages", `${userName} left the chat`);
        }
      } catch (err) {
        console.error("error: ", err.message);
      }
    });

    socket.on("typing", async ({ userName, room, userID }) => {
      try {
        const user = await User.findById(userID);

        if (user) {
          socket.broadcast
            .to(room)
            .emit("system messages", `${userName} typing...`);
        }
      } catch (err) {
        socket.to(room).emit("system messages", `error: ${err.message}`);
      }
    });

    socket.on("disconnect", async () => {
      const { userName, userID } = socket.data || {};
      if (userID) {
        const user = await User.findById(userID);
        if (user) {
          console.log(`${userID} is disconnected from the server.`);
          user.rooms.forEach((r) => {
            socket
              .to(r)
              .emit("system messages", `${user.name} is disconnected.`);
          });
          user.isOnline = false;
          await user.save();
        }
      }
    });
  } catch (err) {
    console.error("error: ", err.message);
    socket.emit("system messages", `Server error: ${err.message}`);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

httpServer.listen(PORT2, () => {
  console.log(`Server is running on port ${PORT2}`);
});
