const mongoose=require("mongoose")

const appointmentSchema= new mongoose.Schema({
    userID:String,
    userInfo:Object,
    pet:Object,
    doctorID:String,
    doctorInfo:Object,
    date:Date,
    timeSlot:String,
    category:String,
    status:{ type: String, default: "pending"}
})

module.exports = mongoose.model("Appointment",appointmentSchema);
