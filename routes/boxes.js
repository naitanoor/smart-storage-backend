const express = require("express");
const router = express.Router();
const db = require("../services/db");

// POST /boxes/create
router.post("/create", async (req, res) => {
  const {
    boxName,
    boxNumber,
    rackNumber,
    storeRoom,
    warehouse,
    qrCode,
    userId,
    items,
  } = req.body;

  try {
    // Check if qrCode is already used
    const qrCodeCheckResult = await db.query(
      "SELECT boxId FROM Boxes WHERE qrCode = ?",
      [qrCode]
    );

    if (qrCodeCheckResult.length > 0) {
      // throw new Error("QrCode already used");
      return res.status(400).json({
        success: false,
        error:
          "QrCode already attached to some other box, make sure to attach a new one.",
      });
    }

    // Start a database transaction
    await db.beginTransaction();

    // Insert a new box into the Boxes table
    const boxResult = await db.query(
      "INSERT INTO Boxes (boxName, boxNumber, rackNumber, storeRoom, warehouse, qrCode, userId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [boxName, boxNumber, rackNumber, storeRoom, warehouse, qrCode, userId]
    );

    const boxId = boxResult.insertId;

    // Insert items into the Items table
    if (items && items.length > 0) {
      for (const item of items) {
        const keywords = JSON.stringify(item.keywords);
        await db.query(
          "INSERT INTO Items (name, itemNumber, itemImage, keywords, boxId) VALUES (?, ?, ?, ?, ?)",
          [item.name, item.itemNumber, item.itemImage, keywords, boxId]
        );
      }
    }

    // Commit the transaction
    await db.commit();

    // Retrieve the newly created box from the database
    const newBox = await db.query("SELECT * FROM Boxes WHERE boxId = ?", [
      boxId,
    ]);

    res
      .status(201)
      .json({ box: newBox[0], message: "Box and items created successfully" });
  } catch (error) {
    console.error("Error creating new box and items:", error);

    // Rollback the transaction in case of an error
    await db.rollback();

    res.status(500).send("Error creating new box and items");
  } finally {
    // Release the database connection
    // await db.releaseConnection();
  }
});

// GET /boxes/search
router.get("/search", async (req, res) => {
  const { query } = req.query;

  try {
    const sql = `
      SELECT b.*
      FROM Boxes b
      WHERE b.boxName LIKE ? OR b.boxNumber LIKE ? OR b.qrCode LIKE ?
    `;
    const params = [`%${query}%`, `%${query}%`, `%${query}%`];

    const boxResults = await db.query(sql, params);

    const boxes = [];
    for (const box of boxResults) {
      const {
        boxId,
        boxName,
        boxNumber,
        rackNumber,
        storeRoom,
        warehouse,
        qrCode,
        userId,
      } = box;

      const itemSql = `
        SELECT i.itemId, i.name AS itemName, i.itemNumber, i.itemImage, i.keywords
        FROM Items i
        WHERE i.boxId = ?
      `;
      const itemParams = [boxId];
      const itemResults = await db.query(itemSql, itemParams);

      const items = itemResults.map((item) => {
        const { itemId, itemName, itemNumber, itemImage, keywords } = item;
        return {
          itemId,
          name: itemName,
          itemNumber,
          itemImage,
          keywords,
        };
      });

      const boxData = {
        boxId,
        boxName,
        boxNumber,
        rackNumber,
        storeRoom,
        warehouse,
        qrCode,
        userId,
        items,
      };

      boxes.push(boxData);
    }

    res.json({ boxes });
  } catch (error) {
    console.error("Error searching for boxes:", error);
    res.status(500).send("Error searching for boxes");
  }
});

// GET /boxes/user/:userId
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Retrieve all boxes and their associated items for the specified user
    const sql = `
      SELECT b.*, i.itemId, i.name AS itemName, i.itemNumber, i.itemImage, i.keywords
      FROM Boxes b
      LEFT JOIN Items i ON b.boxId = i.boxId
      WHERE b.userId = ?
    `;
    const params = [userId];

    const results = await db.query(sql, params);

    // Group the results by box ID
    const boxes = {};
    results.forEach((row) => {
      const {
        boxId,
        boxName,
        boxNumber,
        rackNumber,
        storeRoom,
        warehouse,
        qrCode,
        itemId,
        itemName,
        itemNumber,
        itemImage,
        keywords,
      } = row;

      if (!boxes[boxId]) {
        boxes[boxId] = {
          boxId,
          boxName,
          boxNumber,
          rackNumber,
          storeRoom,
          warehouse,
          qrCode,
          items: [],
        };
      }

      if (itemId) {
        boxes[boxId].items.push({
          itemId,
          name: itemName,
          itemNumber,
          itemImage,
          keywords,
        });
      }
    });

    const boxData = Object.values(boxes);

    res.json({ boxes: boxData });
  } catch (error) {
    console.error("Error retrieving boxes:", error);
    res.status(500).send("Error retrieving boxes");
  }
});

module.exports = router;
