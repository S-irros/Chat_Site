const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const authToken = require("../middlewares/authToken");

module.exports = (io) => {
  
  router.use((req, res, next) => {
    req.io = io;
    // req.redisClient = redisClient;
    next();
  });

  router.get("/", (req, res) =>
    messageController.getMessages(req, res, req.io)
  );
  router.put("/:id", authToken, (req, res) =>
    messageController.updateMessage(req, res, req.io)
  );
  router.delete("/:id", authToken, (req, res) =>
    messageController.deleteMessage(req, res, req.io)
  );

  return router;
};
