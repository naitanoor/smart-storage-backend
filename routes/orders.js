const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.post("/place-order", async (req, res) => {
  const { userId, shippingAddress, order } = req.body;

  if (!userId || !shippingAddress || !Array.isArray(order)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid request body" });
  }

  try {
    // Insert the order details into the Orders table using prepared statement
    const insertOrderQuery = `
      INSERT INTO Orders (userId, productId, productTitle, quantity, paymentStatus, shippingAddress, totalAmount, deliveryStatus, orderDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await Promise.all(
      order.map(async (item) => {
        // Calculate the totalAmount for each product in the order
        const totalAmount = item.price * item.qty;

        // Insert the order details using prepared statement
        await db.query(insertOrderQuery, [
          userId,
          item.productId,
          item.productName,
          item.qty,
          "Pending",
          shippingAddress,
          totalAmount,
          "Pending",
          new Date(),
        ]);
      })
    );

    res
      .status(200)
      .json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    // Fetch all products from the "Products" table.
    const products = await db.query("SELECT * FROM Products");

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Error retrieving products:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve products" });
  }
});

module.exports = router;
