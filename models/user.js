
const mongoose = require("mongoose");
const passportLoacalMongoose = require("passport-local-mongoose");

// creating schema
userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,

    },
    // it also contains username and passward key by default
   
});

userSchema.plugin(passportLoacalMongoose);

// create model
const User = mongoose.model("User", userSchema);

module.exports = User;