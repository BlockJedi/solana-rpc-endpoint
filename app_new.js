var createError = require("http-errors");
var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var indexRouter = require("./routes/index");
var cors = require("cors");
const redis = require("redis");
const WebSocket = require("ws");
const http = require("http");
const httpProxy = require("http-proxy");

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

// Create an HTTP server instance
const server = http.createServer(app);

// Create a WebSocket server instance
const wss = new WebSocket.Server({ noServer: true });

// Handle upgrade requests to WebSocket connections
server.on("upgrade", function (req, socket, head) {
  if (req.headers["upgrade"] !== "websocket") {
    return;
  }

  wss.handleUpgrade(req, socket, head, function (ws) {
    wss.emit("connection", ws, req);
  });
});

// Handle WebSocket connections
wss.on("connection", function (ws) {
  console.log("WebSocket connection established.");

  ws.on("message", function (message) {
    console.log(`Received message: ${message}`);
    ws.send(`Echoing back message: ${message}`);
  });
});

// Create a reverse proxy instance
const proxy = httpProxy.createProxyServer({});

// Proxy HTTP traffic to app running on port 3000
// app.all("*", function (req, res) {
//   proxy.web(req, res, { target: "http://localhost:3000" });
// });

// Proxy WebSocket traffic to WebSocket server running on port 8900
server.on("upgrade", function (req, socket, head) {
  proxy.ws(req, socket, head, { target: "ws://localhost:8900" });
});

app.use(function (req, res, next) {
  console.log(req.method, req.url);
  next();
});
app.use("/", indexRouter);

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