const express = require("express");
const bodyParser = require("body-parser");
const UserModel = require("../models/UserModel");
const AppointmentModel = require("../models/AppointmentModel");
const PetModel = require("../models/PetModel");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const DoctorModel = require("../models/DoctorModel");
const cors = require("cors");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());


const userRouter = express.Router();

userRouter.get("/signUp", (req ,res) => {
    res.render("userSignup");
})

userRouter.post("/signUp", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new UserModel({ ...req.body, password: hashedPassword });
        const user = await newUser.save();
        res.redirect("/user/login");
    } catch (e) {
        res.render("userSignup", { error: e.message });
    }
});

userRouter.get("/login", (req, res) => {
    res.render("userLogin");
});

userRouter.post("/login", passport.authenticate("user-local", { failureRedirect: "/user/login" }),
async function(req, res){
    res.redirect("/user/dashboard");
});

userRouter.get("/dashboard", async (req, res) => {  
    if(req.user && req.user.role === "user"){
        const username = req.user.username;
        const id = req.user.id;
        const appointments = await AppointmentModel.find({userID: id}).sort({date: -1})
        res.render("userDashboard", {username: username, appointments: appointments, userId: id});
    } else {
        res.redirect("/user/login");
    }
});

userRouter.get("/pets", async (req, res) => {
    if(req.user && req.user.role === "user"){
        const id = req.user.id;
        const pets = await PetModel.find({userID: id});
        res.render("pets", {pets: pets});
    } else {
        res.redirect("/user/login");
    }
});

userRouter.get("/add", async (req, res) => {
    if(req.user && req.user.role === "user"){
        res.render("addPet");
    } else {
        res.redirect("/user/login");
    }
});

userRouter.post("/add", async (req, res) => {
    try {
        const id = req.user.id;
        const user = req.user;
        const appointments = await AppointmentModel.find({userID: id});
        const newPet = new PetModel({ ...req.body, userID: id});
        const pet = await newPet.save();
        user.pet.push(pet);
        await user.save();
        res.redirect("/user/pets");
    } catch(e) {
        console.log(e);
        res.render("userDashboard", { error: e.message , username: req.user.username});
    }
});

userRouter.get("/book", async (req, res) => {
    if(req.user && req.user.role === "user"){
        const doctors = await DoctorModel.find({});
        const pets = await PetModel.find({userID: req.user.id});
        res.render("userBooking", {doctors: doctors, pets: pets});
    } else {
        res.redirect("/user/login");
    }
});

userRouter.post("/book", async (req, res) => {
    try{
        const userId = req.user.id;
        const user = req.user;
        const date = req.body.date;
        const timeSlot = req.body.timeSlot;
        const category = req.body.category;
        const pet = await PetModel.findOne({petName: req.body.pet});
        const doctorName = req.body.doctor;
        const doctor = await DoctorModel.findOne({username: doctorName});

        const conflictAppointments = await AppointmentModel.find({
            date: date,
            $or: [
                {timeSlot: timeSlot},
                {timeSlot: {$regex: '${timeSlot}-.*'}},
            ]
        });

        if (conflictAppointments.length >0) {
            return res.status(400).send("Slot already booked");
        };
        
        const newAppointment = new AppointmentModel({
            userID: userId, 
            userInfo: user,
            date: date,
            timeSlot: timeSlot,
            pet: pet,
            category: category,
            doctorID: doctor.id, 
            doctorInfo: doctor
        });
        await newAppointment.save();
        res.redirect("/user/dashboard");
    } catch (e) {
        console.log(e);
    }
});

userRouter.get("/profiles", async (req, res) => { 
    if(req.user && req.user.role === "user"){
        const doctors = await DoctorModel.find({}).populate({
            path: "reviews",
            populate: {
                path: "userId",
                model: "User",
                select: "username"
            }
        });
        res.render("doctorprofiles", {doctors: doctors});
    } else {
        res.redirect("/user/login");
    }
});

userRouter.post("/:doctorId/review", async (req, res) => {
    const { doctorId } = req.params;
    const { comment, rating } = req.body;
    const userId = req.user.id

    try{
        const doctor = await DoctorModel.findById(doctorId);
        const user = await UserModel.findById(userId);

        const reviewExists = doctor.reviews && doctor.reviews.some(review => review.userId && review.userId.toString() === userId);
        if(reviewExists){
            return res.status(400).send("review already submitted");
        }
    
        doctor.reviews.push({userId, comment, rating});
        await doctor.calculateAverageRating();
        await doctor.save();
        res.redirect("/user/dashboard");
    } catch(err) {
        console.error(err);
        res.status(500).send("failed to submit");
    }
});

userRouter.get("/appointment/:id", async (req, res) => {
    
    const appointment = await AppointmentModel.findById(req.params.id)
        .sort({date: -1})
        .populate({
            path: 'doctorInfo',
            model: 'Doctor',
            populate: {
                path: 'reviews.userId',
                model: 'User',
            }
        });
    const user = await UserModel.findById(req.user.id);
    const userId = user._id;
    res.render("uappointment", {appointment: appointment, userId: userId});
});

userRouter.get("/appointment/:id/reschedule", async (req, res) => {
    const appointment = await AppointmentModel.findById(req.params.id);
    const user = await UserModel.findById(req.user.id);

    res.render("reschedule", {appointment: appointment});
});

userRouter.post("/appointment/:id/reschedule", async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { newDate, newTime } = req.body;

        const appointment = await AppointmentModel.findById(appointmentId);

        if (!appointment) {
            return res.status(404).send("Appointment not found.");
        }

        appointment.date = newDate;
        appointment.timeSlot = newTime;

        await appointment.save();

        res.redirect("/user/dashboard");

    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to reschedule appointment.");
    }
});

userRouter.post("/appointment/:id/cancel", async (req, res) => {
    try {
        const appointmentId = req.params.id;;
        if (!await AppointmentModel.findById(appointmentId)) {
            return res.status(404).send("appointment not found");
        }
        await AppointmentModel.findByIdAndDelete(appointmentId);
        res.redirect("/user/dashboard");
    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to update appointment status.");
    }
});

userRouter.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.clearCookie('session_id');
        res.redirect('/');
    });
});


module.exports = {userRouter};
