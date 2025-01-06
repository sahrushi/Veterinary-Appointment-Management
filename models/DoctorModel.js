const mongoose=require("mongoose")
const passportLocalMongoose = require("passport-local-mongoose");

const doctorSchema= new mongoose.Schema({
    userName:String,
    email:String,
    password:String,
    gender:String,
    contact:Number,
    experience:Number,
    role: { type: String, default: 'doctor' },
    reviews: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: String,
        rating: Number
    }],
    avgRating: { type: Number, default: 0 }
});

doctorSchema.methods.calculateAverageRating = function() {
    const totalReviews = this.reviews.length;
    if (totalReviews > 0) {
        const sumOfRatings = this.reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const avgRating = (sumOfRatings / totalReviews).toFixed(2);
        this.avgRating = parseFloat(avgRating);
    } else {
        this.avgRating = 0;
    }
};

doctorSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Doctor",doctorSchema);