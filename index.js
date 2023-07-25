const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 4000;

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

const ordersRoute = require("./routes/orders");
app.use("/orders", ordersRoute);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening at http://0.0.0.0:${PORT}`);
});
