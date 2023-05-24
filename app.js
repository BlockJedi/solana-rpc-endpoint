var createError = require("http-errors");
var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var indexRouter = require("./routes/index");
var cors = require("cors");
const redis = require("redis");

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const db = require("./models");
async function connectdb(){
  console.log("connecting to database");
  const uri = process.env.DB_URL;
await db.mongoose
  .connect(uri, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    dbName: process.env.DB_NAME,
    useNewUrlParser: true, useUnifiedTopology: true,// serverApi: db.mongoose.serverApi
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });
}

connectdb();



app.use("/", indexRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.get("*", (req, res, next) => {
  try {
    next();
  } catch (error) {
    console.log(error);
    throw new Error("Something went wrong");
  }
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  // res.render("error");
});

module.exports = app;
// module.exports = redisClient;
