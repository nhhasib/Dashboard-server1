const express = require("express")
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT||5000

app.use(cors())
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorization token' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unathorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uld9vql.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const usersCollection=client.db('Dashboard').collection('users')
    const itemsCollection=client.db('Dashboard').collection('items')
    const ItemSelectedCollection=client.db('Dashboard').collection('itemselected')
    const OrderedCollection=client.db('Dashboard').collection('orders')

    app.post('/jwt', (req,res) => {
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'});
      res.send({token})
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role!=='admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    app.get("/allUsers",verifyJWT,verifyAdmin, async (req, res) => {
      const result =await usersCollection.find().toArray();
    res.send(result)
})

    app.get('/users',verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
         const decodedEmail = req.decoded.email;
    if (email !== decodedEmail) {
      return res.status(403).send({ error: true, message: 'forbidden access' })
    }
    const query = { email: email };
    const result = await usersCollection.findOne(query);
    res.send(result);
    })

    app.post("/users", async (req, res) => {
      const data = req.body;
      const query = { email: data.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(data);
      res.send(result);
    });
    app.patch('/users/admin/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const filter = { _id:new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
          $set: {
              role:'admin'
          },
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result)
  })
  app.patch('/users/doctor/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    console.log(id)
    const filter = { _id:new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
        $set: {
            role:'doctor'
        },
    }
    const result = await usersCollection.updateOne(filter, updateDoc, options);
    res.send(result)
  })

  app.patch('/users/customer/:id',verifyJWT,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    console.log(id)
    const filter = { _id:new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
        $set: {
            role:'customer'
        },
    }
    const result = await usersCollection.updateOne(filter, updateDoc, options);
    res.send(result)
  })
    app.get('/items',verifyJWT, async (req, res) => {
      const result = await itemsCollection.find().toArray();
      res.send(result)
    })

    app.get('/myItems',verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
          res.send([])
      }
      const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }

  const query = { email: email };
  const result = await itemsCollection.find(query).toArray();
  res.send(result);
  })
    
  app.delete('/myItems/:id', async(req, res)=> {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await itemsCollection.deleteOne(query);
      res.send(result)
  })    

    app.post('/items',verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await itemsCollection.insertOne(data);
      res.send(result)
    })
    app.patch('/items/approve/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
           status:'approved'
        },
    }
      const result = await itemsCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.patch('/items/denied/:id',verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
           status:'denied'
        },
    }
      const result = await itemsCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    
    app.post('/items/ordered',verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await OrderedCollection.insertOne(data);
      res.send(result)
    })
    app.get('/items/ordered',verifyJWT, async(req,res)=> {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const query = { email: email };
    const result = await OrderedCollection.find(query).toArray();
    res.send(result);
    })

    app.get('/selectedItems',verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
          res.send([])
      }
      const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }
  const query = { email: email };
  const result = await ItemSelectedCollection.find(query).toArray();
  res.send(result);
  })
  
  app.post('/selectedItems',verifyJWT, async (req, res) => {
    const data = req.body;
    const result = await ItemSelectedCollection.insertOne(data);
    res.send(result)
  })
    
  app.delete('/selectedItems/:id',verifyJWT, async(req, res)=> {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await ItemSelectedCollection.deleteOne(query);
    res.send(result)
})


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})