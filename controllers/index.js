const request = require("request");
require("dotenv").config();
const redis = require("redis");

const db = require("../models");
const { whitelistIP: WhitelistIP } = db;

let redisClient;
(async () => {
  redisClient = redis.createClient({
    host: "127.0.0.1",
    port: 6379,
    retry_strategy: () => 1000,
  });

  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  redisClient.on("ready", () => console.log(`Redis Connected`));

  await redisClient.connect();
})();
module.exports.redisClient = redisClient;



module.exports.connectRPC = async (req, res) => {
  try {
    let options = {
      url: "http://127.0.0.1:8899/",
      method: "post",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(req.body),
    };
    request(options, (error, response, body) => {
      if (error) {
        console.error("An error has occurred: ", error);
        return res.status(200).json(error);
      } else {
        console.log("Post successful: response: ", body);
        return res.status(200).json(JSON.parse(body));
      }
    });
  } catch (error) {
    console.log("========in catch=======");
    console.log(error);
    let err = error;
    return res
      .status(401)
      .json({ status: "error", message: "something went wrong", error: err });
  }
};



module.exports.addWLIP = async (req, res) => {
  try {
    let { ip, limit, key } = req.body;
    console.log(req.body);
    if (ip == "" || limit == "") {
      return res.status(400).json({
        status: "error",
        message: "check your inputs they must be non empty!",
      });
    }
    if (key != process.env.ACCESS_TOKEN) {
      return res.status(401).send({
        status: "UnAuthorized",
        message: "you are unautherized for this action!",
      });
    }
    let whitelistIp = await WhitelistIP.findOne({ ip: ip });
    console.log(whitelistIp);

    if (whitelistIp != null) {
      return res
        .status(400)
        .send({ status: "error", message: "user already whitelisted" });
    }
    if (!whitelistIp) {
      let wl_ip = new WhitelistIP({
        ip: ip,
        limit:limit,
        isActive: true,
      });

      wl_ip.save(async function (err) {
        if (err) {
          console.log("save error", err);
          return res.status(200).send({ status: "error", message: err });
        } else {
          // add IP and limit to Redis
          // await redisClient.set(ip, JSON.stringify({ip: ip, limit:limit}));
          await redisClient.set(ip, limit);
         
          console.log("done");
          const ipStored = await redisClient.get(ip);
          console.log("ip: " + ipStored);
          return res.status(200).send({
            status: "success",
            message: "Ip whitelisted successfully.",
          });
        }
      });
    } else {
      return res
        .status(200)
        .send({ status: "success", message: "ip already whitelisted" });
    }
  } catch (error) {
    console.log("add wl catch", error);
    return res.status(400).send({ status: "error", message: error });
  }
};

module.exports.removeWLIP = async (req, res) => {
  try {
    let { discordID, key } = req.body;
    if (discordID == "") {
      return res.status(400).json({
        status: "error",
        message: "check your inputs they must be non empty!",
      });
    }
    if (key != process.env.ACCESS_TOKEN) {
      return res.status(401).send({
        status: "UnAuthorized",
        message: "you are unautherized for this action!",
      });
    }
    let whitelistIp = await WhitelistIP.findOne({ discordID: discordID });
    console.log(whitelistIp);
    if (!whitelistIp) {
      return res
        .status(400)
        .json({ status: "error", message: "No recourd found." });
    }
    //  else if (whitelistIp.isActive == false) {
    //   return res
    //     .status(400)
    //     .json({ status: "error", message: "user already deleted!" });
    // }
    else {
      await WhitelistIP.deleteOne({ discordID: discordID }).then(
        (result, err) => {
          if (result) {
            return res
              .status(400)
              .send({ status: "success", message: "ip successfully deleted" });
          } else {
            return res.status(200).send({
              status: "error",
              message: err,
            });
          }
        }
      );
    }
  } catch (error) {
    console.log(error);
    return res.status(400).send({ status: "error", message: error });
  }
};

module.exports.updateWLIP = async (req, res) => {
  try {
    let { ip, limit, key } = req.body;
    if (limit == "" || ip == "") {
      return res.status(400).json({
        status: "error",
        message: "check your inputs they must be non empty!",
      });
    }
    if (key != process.env.ACCESS_TOKEN) {
      return res.status(401).send({
        status: "UnAuthorized",
        message: "you are unautherized for this action!",
      });
    }
    // let ip_exists = await WhitelistIP.findOne({ ip: ip });
    // if (ip_exists) {
    //   return res
    //     .status(400)
    //     .json({ status: "error", message: "ip already exists!" });
    // }

    let whitelistIp = await WhitelistIP.findOne({ ip: ip });
    // console.log("ip", ip_exists);

    if (!whitelistIp) {
      return res.status(400).json({
        status: "error",
        message: "No ip found.",
      });
    }
    else {
      await WhitelistIP.updateOne(
        { ip: ip },
        {
          $set: {
            limit: limit,
          },
        },
        {
          new: true,
        }
      ).then(() => {
        res.status(200).send({
          status: "success",
          message: "limit successfully updated",
        });
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).send({ status: "error", message: error });
  }
};


module.exports.getWLIP = async (req, res) => {
  try {
    let {key } = req.body;
    console.log(key)
    if (key != process.env.ACCESS_TOKEN) {
      return res.status(401).send({
        status: "UnAuthorized",
        message: "you are unautherized for this action!",
      });
    }
    WhitelistIP.find({}, function(err, wl_ips) {
      res.send(wl_ips);  
    });
    
  } catch (error) {
    console.log(error);
    return res.status(400).send({ status: "error", message: error });
  }
};

module.exports.getWhitelistedIP = async (req, res) => {
  try {
    let {key,discordID } = req.body;

    if (key != process.env.ACCESS_TOKEN) {
      return res.status(401).send({
        status: "UnAuthorized",
        message: "you are unautherized for this action!",
      });
    }
    WhitelistIP.findOne({discordID: discordID}, function(err, wl_ip) {
      if(wl_ip){
        res.send(wl_ip);  
      }
      else{res.send({message: "record not found"})}
      
    });
    
  } catch (error) {
    console.log(error);
    return res.status(400).send({ status: "error", message: error });
  }
};



