const mongoose = require("mongoose");
const init_data = require("./data.js");
const Listing = require("../models/listing.js");

// connection to db
main().then(() => {console.log("connected to db")}).catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');

}

// fuction to save data in db
const initDB = async () => {
    await Listing.deleteMany({});

    await Listing.insertMany(init_data.data);
    console.log("data was initialized");
}

initDB();