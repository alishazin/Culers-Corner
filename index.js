
const PORT = process.env.PORT || 8080

require('dotenv').config()
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");

// Initializing Database
mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.5lvif7n.mongodb.net/?retryWrites=true&w=majority`);

const playerStandingsSchema = new mongoose.Schema({
    data: {
        type: Array,
        required: true
    },
    league: {
        type: Number,
        required: true
    },
    season: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    },
})

const PlayerStandings = mongoose.model("PlayerStandings", playerStandingsSchema);

// User-defined
const fixtureEndpoint = require(`${__dirname}/apps/fixture/endpoints.js`); 
const standingsEndpoint = require(`${__dirname}/apps/standings/endpoints.js`); 

// Initializing Express App
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("build"));

app.use(
    express.static(path.join(__dirname, "../client/build"))
);

// Endpoints
fixtureEndpoint.initialize(app);
standingsEndpoint.initialize(app, PlayerStandings);

// 404 Endpoint (Add at last)
app.use((req, res) => {
    res.status(404).send();
});

app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
})