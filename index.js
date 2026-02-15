const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./asset-verse-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const verifyFBToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({ message: "Unauthorized access" });
    }

    // Extract token
    const idToken = authHeader.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(idToken);

    console.log("Decoded token:", decoded);

    // Attach email and uid to req
    req.decoded_email = decoded.email;
    req.decoded_uid = decoded.uid;

    next();
  } catch (err) {
    console.error("Token verification error:", err);

    // If token invalid / expired → 401
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

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
    // await client.connect();

    const db = client.db("asset-verse-server");
    const assetscollection = db.collection("assets-collection");
    const usercollection = db.collection("users");
    const requestsCollection = db.collection("requests");
    const teamCollection = db.collection("team");
    const paymentCollection = db.collection("payment");
    const hrCollection = db.collection("hrManagers");

    // hr request option

    app.post("/hr/register", async (req, res) => {
      try {
        const hrData = req.body;

        const newHR = {
          ...hrData,
          role: "hr",
          status: "pending",
          createdAt: new Date(),
        };

        const result = await hrCollection.insertOne(newHR);

        res.send({
          success: true,
          message: "HR request submitted successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Failed to register HR",
        });
      }
    });

    // Get All HR
    app.get("/hr", async (req, res) => {
      try {
        const result = await hrCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Failed to fetch HR data" });
      }
    });

    // Approve HR
    app.patch("/hr/approve/:id", async (req, res) => {
      const id = req.params.id;

      const result = await hrCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "approved" } },
      );

      res.send(result);
    });

    // Reject HR
    app.patch("/hr/reject/:id", async (req, res) => {
      const id = req.params.id;

      const result = await hrCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "rejected" } },
      );

      res.send(result);
    });
    // payment option

    app.post("/payment", verifyFBToken, async (req, res) => {
      try {
        const paymentInfo = req.body;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: paymentInfo.price * 100, // convert dollars to cents
                product_data: { name: paymentInfo.plan },
              },
              quantity: 1,
            },
          ],
          customer_email: paymentInfo.senderEmail,
          mode: "payment",
          success_url: `${process.env.SIDE_DOMAIN}/dashboard/payment-success`,
          cancel_url: `${process.env.SIDE_DOMAIN}/dashboard/payment-cancelled`,
        });

        res.send({ url: session.url });
      } catch (error) {
        console.error("Stripe session error:", error);
        res.status(500).send({ error: "Failed to create payment session" });
      }
    });

    app.post("/confirm-payment", async (req, res) => {
      try {
        const { sessionId } = req.body;
        if (!sessionId)
          return res.status(400).send({ error: "No session ID provided" });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log("Stripe session:", session);

        // Save payment info in DB
        if (session.payment_status === "paid") {
          await paymentCollection.updateOne(
            { email: session.customer_email },
            {
              $set: {
                email: session.customer_email,
                plan: session.display_items?.[0]?.custom?.name || "unknown",
                amount: session.amount_total / 100,
                status: "paid",
                timestamp: new Date(),
              },
            },
            { upsert: true },
          );
        }

        res.send(session);
      } catch (error) {
        console.error("Stripe confirm error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // Add user to team
    app.post("/team", async (req, res) => {
      const { userId } = req.body;

      const teamCount = await teamCollection.countDocuments({});
      if (teamCount >= 10) {
        return res.status(400).send({ message: "Team limit reached" });
      }

      const user = await usercollection.findOne({ _id: new ObjectId(userId) });
      if (!user) return res.status(404).send({ message: "User not found" });

      const alreadyInTeam = await teamCollection.findOne({
        _id: new ObjectId(userId),
      });
      if (alreadyInTeam)
        return res.status(400).send({ message: "User already in team" });

      const result = await teamCollection.insertOne({
        ...user,
        addedAt: new Date(),
      });
      res.send(result);
    });

    app.get("/team", async (req, res) => {
      const team = await teamCollection.find({}).toArray();
      res.send(team);
    });
    // Remove user from team
    app.delete("/team/:id", async (req, res) => {
      const { id } = req.params;
      const result = await teamCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // end

    // middlewore with database access
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded_email;
      const query = { email };
      const user = await usercollection.findOne(query);

      if (!user || user.role !== "admin ") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // requests api

    app.get("/requests", async (req, res) => {
      const query = {};
      if (req.query.requestStatus) {
        query.requestStatus = req.query.requestStatus;
      }

      const result = await requestsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/requests", verifyFBToken, async (req, res) => {
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

    app.patch("/requests/:id", verifyFBToken, async (req, res) => {
      const { requestStatus } = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = { $set: { requestStatus } };
      const result = await requestsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // user api
    app.get("/users", verifyFBToken, async (req, res) => {
      const searchText = req.query.searchText;
      const query = {};
      if (searchText) {
        query.$or = [
          { displayName: { $regex: searchText, $options: "i" } },
          { email: { $regex: searchText, $options: "i" } },
        ];
      }
      const cursor = usercollection
        .find(query)
        .sort({
          createdAt: -1,
        })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // app.get("/users/:id", async (req, res) => {});

    app.get("/users/:email/role", verifyFBToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usercollection.findOne(query);
      res.send({ role: user?.role || "user" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "employee";
      user.createdAt = new Date();
      const email = user.email;

      const userExists = await usercollection.findOne({ email });
      if (userExists) {
        return res.send({ Message: "user exists" });
      }

      const result = await usercollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/:id/role",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const roleInfo = req.body;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: roleInfo.role,
          },
        };
        const result = await usercollection.updateOne(query, updatedDoc);
        res.send(result);
      },
    );

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
    // st
    app.patch("/assets-collection/:id", async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: { quantity },
      };

      const result = await assetscollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
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
