const express = require("express");
const cors = require("cors");
var enforce = require("express-sslify");

const app = express();

const PORT = 8080;

app.use(
  enforce.HTTPS({
    trustProtoHeader: true,
  })
);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

const exampleRoute = require("./routes/example");
app.use("/", exampleRoute);

const usersRoute = require("./routes/users");
app.use("/users", usersRoute);

const boxesRoute = require("./routes/boxes");
app.use("/boxes", boxesRoute);

const storageRoute = require("./routes/storage");
app.use("/storage", storageRoute);

app.listen(PORT, () => {
  console.log(`Server listening at http://0.0.0.0:${PORT}`);
});
