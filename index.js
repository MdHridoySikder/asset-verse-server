const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// asset-verse-server
// Wr7PcrMOx9TZkCPP

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.su41mbr.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("asset-verse-server");
    const assetscollection = db.collection("assets-collection");

    // assets-collection api

    app.get("/assets-collection", async (req, res) => {
      const query = {};

      const options = { sort: { createdAt: -1 } };

      const cursor = assetscollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/assets-collection", async (req, res) => {
      const assets = req.body;
      assets.createdAt = new Date();
      const result = await assetscollection.insertOne(assets);
      res.send(result);
    });
    app.delete("/assets-collection/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assetscollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Asset Verse sever is runnig!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
