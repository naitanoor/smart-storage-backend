const express = require("express");
const app = express();

const port = 3000;

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

const exampleRoute = require("./routes/example");
app.use("/", exampleRoute);

const usersRoute = require("./routes/users");
app.use("/users", usersRoute);

const boxesRoute = require("./routes/boxes");
app.use("/boxes", boxesRoute);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// // Create a MySQL connection pool
