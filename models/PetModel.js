const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
    petName:String,
    type:String,
    age:Number,
    userID:String,
    medicHistory:String,
});

module.exports = mongoose.model("Pet", petSchema);