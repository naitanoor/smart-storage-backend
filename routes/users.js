const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();
const db = require("../services/db");

async function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // or the appropriate port for your email service
    secure: false, // true for 465, false for other ports
    auth: {
      user: "israr.work210@gmail.com",
      pass: "xaaqjjmfxxdbmdkf",
    },
  });
}

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

router.post("/forget-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (!emailExists) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Generate a 6-digit random reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const transporter = await createTransporter();
    // Send the password reset email
    const mailOptions = {
      from: "smart-storage@app.com", // Replace with your email address
      to: email,
      subject: "Password Reset",
      text: `You have requested to reset your password. Your reset code is: ${resetCode}`,
    };

    await transporter.sendMail(mailOptions);

    // Perform an entry in the AuthReset table
    const sql =
      "INSERT INTO AuthReset (email, resetCode, resetCodeStatus) VALUES (?, ?, ?)";
    const params = [email, resetCode, "PENDING"];
    await db.query(sql, params);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).send("Error sending password reset email");
  }
});

router.post("/confirm-reset-password", async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  try {
    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (!emailExists) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Check if the reset code status is "PENDING"
    const authResetEntry = await db.query(
      "SELECT * FROM AuthReset WHERE email = ?",
      [email]
    );

    if (
      !authResetEntry ||
      authResetEntry.length === 0 ||
      authResetEntry[0].resetCodeStatus !== "PENDING"
    ) {
      // Invalid reset code status
      return res.status(400).json({ message: "Invalid reset code status" });
    }

    // Check if the reset code and email match from the AuthReset table
    if (authResetEntry[0].resetCode !== resetCode) {
      // Invalid reset code
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Update the user password in the Users table
    await db.query("UPDATE Users SET password = ? WHERE email = ?", [
      newPassword,
      email,
    ]);

    // Update reset code status to "USED" in AuthReset table
    await db.query(
      "UPDATE AuthReset SET resetCodeStatus = 'USED' WHERE email = ?",
      [email]
    );

    // Send a success response
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).send("Error resetting password");
  }
});

module.exports = router;
