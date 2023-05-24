const router = require("express").Router();
const {
  connectRPC,
  addWLIP,
  removeWLIP,
  updateWLIP,
  getWLIP,
  getWhitelistedIP,
  redisClient
} = require("../../controllers/index");

const db = require("../../models");
const { whitelistIP: WhitelistIP } = db;
const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
  windowMs: 1000, 
  max: 50,
  message: "You have exceeded the 50 requests in 1 sec limit!",
  standardHeaders: true,
  legacyHeaders: false,
});


const ipLimiter = async (req, res, next) => {
  // const ip = req.ip;
      var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress; // "::ffff:52.59.195.10";


  console.log(ip)

  // Check if the IP exists in Redis
  const limit = await redisClient.get(ip)
  console.log("abc", limit)
  if (limit !== null) {
    console.log("IP found in Redis, applying rate limit:", ip, limit);
    apiLimiter.max = limit;
    apiLimiter.message = `You have exceeded the ${limit} requests in 1 sec limit!`;
    return apiLimiter(req, res, next);
  } else {
    console.log("IP not found in Redis, checking MongoDB:", ip);
    // Check if the IP exists in MongoDB
    WhitelistIP.findOne({ ip: ip }, (err, result) => {
      if (err) {
        console.error("MongoDB query error:", err);
        return next();
      }

      if (result) {
        console.log("IP found in MongoDB, setting Redis key:", ip);
        // Set the IP in Redis for future use
        redisClient.set(ip, result.limit, (err, res) => {
          if (err) {
            console.error("Redis error:", err);
          }
        });
      
        apiLimiter.options.max = +result.limit;
        apiLimiter.options.message = `You have exceeded the ${result.limit} requests in 1 sec limit!`;
        return apiLimiter(req, res, next);
      } else {
        console.log("IP not found in MongoDB, returning 401 for unauthorized request:", ip);
        return res.status(401).send("Unauthorized request");
      }
    });
  }
  redisClient.get("0.0.0.0", (err, limit) => {
    console.log("hi")
    if (err) {
      console.error("Redis error:", err);
      return next();
    }
    
    
  });
};

router.post("/v0/node", ipLimiter, apiLimiter, connectRPC);
router.post("/v0/node1", connectRPC);
router.post("/v0/add-wl-ip",  addWLIP);
router.post("/v0/remove-wl-ip",  removeWLIP);
router.post("/v0/update-wl-ip",  updateWLIP);
router.post("/v0/get-wl-ip",  getWLIP);
router.post("/v0/get-ip",  getWhitelistedIP);


module.exports = router;
