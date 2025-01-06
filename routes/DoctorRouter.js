const express = require("express");
const bodyParser = require("body-parser");
const DoctorModel = require("../models/DoctorModel");
const AppointmentModel = require("../models/AppointmentModel");
const passport = require("passport");
const bcrypt = require("bcryptjs");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

const doctorRouter = express.Router();

doctorRouter.get("/signUp", (req ,res) => {
    res.render("doctorSignup");
})

doctorRouter.post("/signUp", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new DoctorModel({ ...req.body, password: hashedPassword });
        const user = await newUser.save();
        res.redirect("/doctor/login");
    } catch (e) {
        res.render("doctorSignup", { error: e.message });
    }
});

doctorRouter.get("/login", (req, res) => {
    res.render("doctorLogin");
});

doctorRouter.post("/login", passport.authenticate("doctor-local", { failureRedirect: "/doctor/login" }),
async function(req, res){
    res.redirect("/doctor/dashboard");
});

doctorRouter.get("/dashboard", async (req, res) => {
    try {
        if(req.user && req.user.role === "doctor") {
            const doctor = req.user;
            const appointments = await AppointmentModel.find({ doctorID: req.user.id }).populate('userInfo', 'username').populate('doctorInfo', 'username');
            res.render("doctorDashboard", { appointments: appointments, doctor: doctor });
        } else {
            res.redirect("/doctor/login");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to load appointments.");
    }
});

doctorRouter.get("/appointment/:id", async (req, res) => {
    
    const appointment = await AppointmentModel.findById(req.params.id);

    res.render("dappointment", {appointment: appointment});
});

doctorRouter.post("/appointment/:id/status", async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const newStatus = req.body.status;

        const updatedAppointment = await AppointmentModel.findByIdAndUpdate(
            appointmentId,
            { status: newStatus },
            { new: true }
        );

        if (!updatedAppointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        res.redirect("/doctor/dashboard");
    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to update appointment status.");
    }
});

doctorRouter.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.clearCookie('session_id');
        res.redirect('/');
    });
});

module.exports = {doctorRouter};
