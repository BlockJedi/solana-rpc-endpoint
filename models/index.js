const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.whitelistIP = require("./wl_ip.model");

module.exports = db;