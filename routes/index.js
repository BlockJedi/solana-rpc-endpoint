const router = require("express").Router();

const userRoutes = require("./userRoutes/index");
router.use("/rpc", userRoutes);
module.exports = router;
