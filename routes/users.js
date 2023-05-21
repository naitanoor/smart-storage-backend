const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Function to check if email already exists
const checkEmailExists = async (email) => {
  const existingUser = await db.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return existingUser.length > 0;
};

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      return res.status(400).send("Email already exists");
    }

    // Insert new user
    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password]
    );
    if (result.length === 0) {
      res.status(401).send("Invalid email or password");
      return;
    }
    res.send("User signup successful");
  } catch (error) {
    console.error("Error signing up user:", error);
    res.status(500).send("Error signing up user. " + error);
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (result.length === 0) {
      res.status(401).send("Invalid email or password");
      return;
    }

    const user = result[0];
    res.json({
      message: "User signin successful",
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error signing in user:", error);
    res.status(500).send("Error signing in user");
  }
});

router.put("/update/:userId", async (req, res) => {
  const userId = req.params.userId;
  const newName = req.body.name;

  try {
    const result = await db.query(
      "UPDATE users SET name = ? WHERE userId = ?",
      [newName, userId]
    );
    if (result.affectedRows === 0) {
      res.status(404).send("User not found");
      return;
    }
    // Retrieve the updated user data from the database
    const updatedUser = await db.query("SELECT * FROM users WHERE userId = ?", [
      userId,
    ]);
    res.send({ user: updatedUser[0] }); // Return the first row of the updated user data
  } catch (error) {
    console.error("Error updating user name:", error);
    res.status(500).send("Error updating user name");
  }
});

module.exports = router;
