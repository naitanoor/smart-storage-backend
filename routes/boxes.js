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
        message:
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

    res.status(201).json({
      success: true,
      box: newBox[0],
      message: "Box and items created successfully",
    });
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
  const { query, userId } = req.query;

  try {
    const sql = `
    SELECT b.boxId, b.boxName, b.boxNumber, b.rackNumber, b.qrCode, b.userId,
           w.id AS warehouseId, w.name AS warehouseName, w.location AS warehouseLocation, w.capacity AS warehouseCapacity,
           w.contact_person AS warehouseContactPerson, w.contact_phone AS warehouseContactPhone,
           s.id AS storeroomId, s.name AS storeroomName, s.capacity AS storeroomCapacity,
           s.contact_person AS storeroomContactPerson, s.contact_phone AS storeroomContactPhone,
           r.rack_id AS rackId, r.rack_name AS rackName, r.rack_number AS rackNumber, r.capacity AS rackCapacity, r.rack_type AS rackType
    FROM Boxes b
    INNER JOIN Warehouses w ON b.warehouse = w.id
    INNER JOIN Storerooms s ON b.storeRoom = s.id
    INNER JOIN Racks r ON b.rackNumber = r.rack_id
    WHERE (b.boxName LIKE ? OR b.boxNumber LIKE ? OR b.qrCode LIKE ?) AND b.userId = ?
  `;

    const params = [`%${query}%`, `%${query}%`, `%${query}%`, userId];

    const boxResults = await db.query(sql, params);

    if (boxResults.length === 0) {
      return res.status(400).json({
        message: "No boxes found!",
      });
    }

    const boxes = [];
    for (const box of boxResults) {
      const {
        boxId,
        boxName,
        boxNumber,
        qrCode,
        userId,
        warehouseId,
        warehouseName,
        warehouseLocation,
        warehouseCapacity,
        warehouseContactPerson,
        warehouseContactPhone,
        storeroomId,
        storeroomName,
        storeroomCapacity,
        storeroomContactPerson,
        storeroomContactPhone,
        rackId,
        rackName,
        rackNumber,
        rackCapacity,
        rackType,
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

      const warehouse = {
        warehouseId,
        name: warehouseName,
        location: warehouseLocation,
        capacity: warehouseCapacity,
        contactPerson: warehouseContactPerson,
        contactPhone: warehouseContactPhone,
      };

      const storeroom = {
        warehouseId,
        storeroomId,
        name: storeroomName,
        capacity: storeroomCapacity,
        contactPerson: storeroomContactPerson,
        contactPhone: storeroomContactPhone,
      };

      const rack = {
        rackId,
        name: rackName,
        number: rackNumber,
        capacity: rackCapacity,
        type: rackType,
      };

      const boxData = {
        boxId,
        boxName,
        boxNumber,
        storeRoom: storeroom,
        warehouse,
        qrCode,
        userId,
        rack,
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
