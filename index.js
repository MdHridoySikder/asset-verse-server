const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./asset-verse-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const verifyFBToken = async (req, res, next) => {
  const token = req.headers.Authorization;
  if (!token) {
    return res.status(401).send({ Message: "" });
  }
  try {
    const idToken = token.split("")[1];
    const decoded = await admin.auth().verifyFBToken(idToken);
    console.log("decoded in the token", decoded);
    req.decoded_email = decoded.email;

    next();
  } catch (err) {
    return res.status(401).send({ Message: "unAuthorized access" });
  }
};

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
    const usercollection = db.collection("users");
    const requestsCollection = db.collection("requests");
    // const hrcollection = db.collection("hr");

    // requests api
    app.get("/requests", async (req, res) => {
      const query = {};
      if (req.query.status) {
        query.status = req.query.status;
      }

      const cursor = requestsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/requests", async (req, res) => {
      try {
        const request = req.body;
        request.requestDate = new Date();
        request.requestStatus = "pending";
        const result = await requestsCollection.insertOne(request);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Failed to create request" });
      }
    });

    // // hr api
    // app.post("/hr", async (req, res) => {
    //   const hr = req.body;
    // });

    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.createdAt = new Date();
      const email = user.email;

      const userExists = await usercollection.findOne({ email });
      if (userExists) {
        return res.send({ Message: "user exists" });
      }

      const result = await usercollection.insertOne(user);
      res.send(result);
    });

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
