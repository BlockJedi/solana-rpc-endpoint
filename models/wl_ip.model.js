const mongoose = require("mongoose");
const WhitelistIP = mongoose.model(
  "Whitelist",
  new mongoose.Schema({
    ip: {
      type: String,
      required: true
    },
    limit: {
      type: Number,
      required: true
    },
    isActive:{
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  })
);
module.exports = WhitelistIP;
