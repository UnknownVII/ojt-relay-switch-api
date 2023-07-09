const express = require('express');
const app = express();
const dotenv = require('dotenv');
var cors = require('cors')
const verify = require('./app/verify-token');

const port = process.env.PORT || 8080;

//Import Routes
const objectsRoute = require('./src/routes/objects');
const usersRoute = require('./src/routes/user');

dotenv.config();

app.listen(port, () => {
    console.log('[Port    ] Server is running [', port, ']');
});

//Connect to DB
require('./app/config/db.config')();

//Middlewares
app.use(cors());

//content-type - application/json
app.use(express.json());

//ontent-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
    res.json({ message: "HELLO WORLDOOO" });
});

//Route Middleware
app.use('/api', objectsRoute);
app.use('/api', usersRoute);
