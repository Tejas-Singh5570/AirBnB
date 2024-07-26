
const mongoose = require("mongoose");
const { schema } = require("../schema");

// creating review schema
const reviewSchema = new mongoose.Schema({
    comment: String,

    rating: {
        type: Number,
        min: 1,
        max: 5,
    },

    createdAt: {
        type: Date,
        default: Date.now()
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }

});
 
// creating model
const Review = mongoose.model("Review", reviewSchema); 

module.exports = Review;