const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
.then(() => console.log("connected to DB."))
.catch(err => console.error("Error: ", err.message));

module.exports = mongoose;