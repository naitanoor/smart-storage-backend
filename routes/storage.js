const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.post("/warehouse/add", async (req, res) => {
  const warehouse = req.body;
  // Validate required fields
  if (
    !warehouse?.name ||
    !warehouse?.location ||
    !warehouse?.contact_person ||
    !warehouse?.contact_phone
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO Warehouses (userId, name, location, contact_person, contact_phone) VALUES (?, ?, ?, ?, ?)",
      [
        warehouse.userId,
        warehouse.name,
        warehouse.location,
        // warehouse.capacity,
        warehouse.contact_person,
        warehouse.contact_phone,
      ]
    );
    if (result.length === 0) {
      res.status(401).send("Error adding warehouse.");
      return;
    }
    return res
      .status(201)
      .json({ success: true, message: "Warehouse added successfully" });
  } catch (error) {
    console.error("Error adding warehouse:", error);
    res.status(500).send("Error adding warehouse." + error);
  }
});

// API endpoint to fetch all user's warehouses
router.get("/warehouses/:userId", async (req, res) => {
  const userId = req.params.userId;
  // Query the database for the user's warehouses
  const query = `SELECT * FROM Warehouses WHERE userId = ?`;
  try {
    const result = await db.query(query, [userId]);
    if (result.length === 0) {
      res.status(401).send({
        success: false,
        message: "No warehouses found, add one first.",
      });
      return;
    }
    return res.status(201).json({
      success: true,
      data: result,
      message: "Warehouses fetch successfully",
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
    });
  }
});

router.post("/storeroom/add", async (req, res) => {
  const storeroom = req.body;
  // Validate required fields
  if (
    !storeroom?.userId ||
    !storeroom?.name ||
    !storeroom?.capacity ||
    !storeroom?.contact_person ||
    !storeroom?.contact_phone ||
    !storeroom?.warehouse_id
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  try {
    // Check if the warehouse exists and matches the user ID
    const warehouseResult = await db.query(
      "SELECT id FROM Warehouses WHERE id = ? AND userId = ?",
      [storeroom.warehouse_id, storeroom.userId]
    );
    if (warehouseResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found or does not match the user",
      });
    }

    const result = await db.query(
      "INSERT INTO Storerooms (name, capacity, contact_person, contact_phone, warehouse_id, userId) VALUES (?, ?, ?, ?, ?, ?)",
      [
        storeroom.name,
        storeroom.capacity,
        storeroom.contact_person,
        storeroom.contact_phone,
        storeroom.warehouse_id,
        storeroom.userId,
      ]
    );
    if (result.affectedRows === 0) {
      res.status(401).send("Error adding storeroom.");
      return;
    }
    return res
      .status(201)
      .json({ success: true, message: "Storeroom added successfully" });
  } catch (error) {
    console.error("Error adding storeroom:", error);
    res.status(500).send("Error adding storeroom." + error);
  }
});

// GET /api/storerooms/:warehouseId/:userId
router.get("/storerooms/:warehouseId/:userId", async (req, res) => {
  const { warehouseId, userId } = req.params;

  try {
    const storerooms = await db.query(
      "SELECT * FROM Storerooms WHERE warehouse_id = ? AND userId = ?",
      [warehouseId, userId]
    );

    if (storerooms.length === 0) {
      res.status(401).send("No storerooms found, add one first.");
      return;
    }

    res.status(200).json({ success: true, data: storerooms });
  } catch (error) {
    console.error("Error fetching storerooms:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching storerooms" });
  }
});

router.post("/rack/add", async (req, res) => {
  const rack = req.body;
  // Validate required fields
  if (
    !rack?.rack_name ||
    !rack?.capacity ||
    !rack?.rack_type ||
    !rack?.rack_number ||
    !rack?.storeroom_id ||
    !rack?.warehouse_id ||
    !rack?.userId
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO Racks (rack_name, capacity, rack_type, rack_number, storeroom_id, warehouse_id, userId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        rack.rack_name,
        rack.capacity,
        rack.rack_type,
        rack.rack_number,
        rack.storeroom_id,
        rack.warehouse_id,
        rack.userId,
      ]
    );

    if (result.affectedRows === 1) {
      return res
        .status(201)
        .json({ success: true, message: "Rack added successfully" });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to add rack" });
    }
  } catch (error) {
    console.error("Error adding rack:", error);
    res.status(500).json({ success: false, message: "Error adding rack" });
  }
});
router.get("/racks/:userId/:warehouseId/:storeroomId", async (req, res) => {
  const { userId, warehouseId, storeroomId } = req.params;

  try {
    // Retrieve racks based on warehouse ID, storeroom ID, and user ID
    const racks = await db.query(
      "SELECT * FROM Racks WHERE warehouse_id = ? AND storeroom_id = ? AND userId = ?",
      [warehouseId, storeroomId, userId]
    );
    res.status(200).json({ success: true, data: racks });
  } catch (error) {
    console.error("Error retrieving racks:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve racks" });
  }
});

router.get("/products", async (req, res) => {
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
