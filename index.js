const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
// const bcrypt = require("bcryptjs");
const mongodb = require("mongodb");
const jwt = require("jsonwebtoken");
const req = require("express/lib/request");
const res = require("express/lib/response");
require("dotenv").config();
// app
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const verifyUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unouthorized user" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbiden User" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

// connect with mogodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wwhf4.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    const inventoryCoolection = client
      .db("inventoryItems")
      .collection("InventoryCollection");

    // get user access token
    app.post("/login", async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_KEY, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });

    app.get("/inventory-items", async (req, res) => {
      const qurey = {};
      const cursor = inventoryCoolection.find(qurey);
      const inventoryItems = await cursor.limit(6).toArray();

      res.send(inventoryItems);
    });
    app.get("/all-inventory-items", async (req, res) => {
      const qurey = {};
      const cursor = inventoryCoolection.find(qurey);
      const inventoryItems = await cursor.toArray();

      res.send(inventoryItems);
    });

    app.get("/manage-inventory/", async (req, res) => {
      const id = req.query._id;
      const qurey = { _id: mongodb.ObjectId(id) };
      const cursor = inventoryCoolection.find(qurey);

      if (qurey.length === 0) {
        return res
          .status(404)
          .send({ message: "No data found for the request" });
      } else {
        const inventoryItems = await cursor.toArray();
        res.status(200).send(inventoryItems);
      }
    });

    // user items get api
    app.get("/my-items", verifyUser, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      const qurey = { email: email };
      const cursor = inventoryCoolection.find(qurey);
      const myItems = await cursor.toArray();

      res.send(myItems);
    });

    // POST New Item
    app.post("/new-inventory-item", async (req, res) => {
      const newItem = req.body;

      const result = await inventoryCoolection.insertOne(newItem);
      res.send(result);
    });

    // update stock  quantity
    app.put("/inventory-items/:id", async (req, res) => {
      const id = req.params.id;
      const newQuantity = req.body;

      const filter = { _id: mongodb.ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          quantity: newQuantity.quantity,
        },
      };
      const result = await inventoryCoolection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });

    // delete stock item
    app.delete("/inventory-items/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: mongodb.ObjectId(id) };

      const result = await inventoryCoolection.deleteOne(query);
      res.send(result);
    });

    app.get("/", async (req, res) => {
      res.send("Warehouse managment server");
    });
  } finally {
  }
};
run().catch(console.dir);

const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log("Hello there I am Listening on port:", port)
);
