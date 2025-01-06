const mongoose=require("mongoose")
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema= new mongoose.Schema({
    userName:String,
    email:String,
    password:String,
    contact:Number,
    pet:Array,
    role: { type: String, default: 'user' }
})

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",userSchema);