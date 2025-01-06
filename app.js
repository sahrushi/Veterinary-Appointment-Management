const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const {userRouter} = require("./routes/UserRouter");
const {doctorRouter} = require("./routes/DoctorRouter");
const expressSession = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const mongoStore = require("connect-mongo");
const LocalStrategy = require('passport-local').Strategy;
const UserModel = require("./models/UserModel");
const DoctorModel = require("./models/DoctorModel");
const AppointmentModel = require("./models/AppointmentModel");
const bcrypt = require("bcryptjs");
const path = require("path");
const cors = require("cors");
const cron = require("node-cron");
const emailService = require("./emailService");

const app = express();

app.set('view engine', 'ejs');
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressSession({
    secret: "dI0CFCjztT",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000*1000*36
    },
    store: mongoStore.create({mongoUrl: "mongodb://127.0.0.1:27017/vetsDB", collectionName:  "sessions"})
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/vetsDB");

passport.use("user-local", new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
},
async function( email, password, done) {
    try {
        const user = await UserModel.findOne({ email: email });
        if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: 'Incorrect email.' });
        }
        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("Password mismatch for user:", email);
            return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
    } catch (err) {
        console.error("Error during authentication:", err);
        return done(err);
    }
}));

passport.use("doctor-local", new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
},
async function(email, password, done) {
    try {
        const doctor = await DoctorModel.findOne({ email: email });
        if (!doctor) {
            console.log("User not found:", email);
            return done(null, false, { message: 'Incorrect email.' });
        }
        let isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) {
            console.log("Password mismatch for user:", email);
            return done(null, false, { message: "Incorrect password" });
        }
        return done(null, doctor);
    } catch (err) {
        console.error("Error during authentication:", err);
        return done(err);
    }
}));

passport.serializeUser(function (entity, done) {
    done(null, { id: entity.id, role: entity.role });
});

passport.deserializeUser(function (obj, done) {
    switch (obj.role) {
        case 'user':
            UserModel.findById(obj.id)
                .then(user => {
                    if (user) {
                        done(null, user);
                    }
                    else {
                        done(new Error('user id not found:' + obj.id, null));
                    }
                });
            break;
        case 'doctor':
            DoctorModel.findById(obj.id)
                .then(device => {
                    if (device) {
                        done(null, device);
                    } else {
                        done(new Error('device id not found:' + obj.id, null));
                    }
                });
            break;
        default:
            done(new Error('no entity type:', obj.role), null);
            break;
    }
});

app.use("/user", userRouter);
app.use("/doctor", doctorRouter);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/index", (req, res) => {
    res.render("index");
});

const sendAppointmentReminders = async () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const appointments = await AppointmentModel.find({
        date: {
            $gte: date
        },
        statuse: "pending"
    }).populate("userID", "doctorID", "email");

    appointments.forEach(async (appointment) => {
        const userEmail = appointment.userID.email;
        const doctorEmail = appointment.doctorID.email;
        const reminderTime = new Date(appointment.date);
        reminderTime.setHours(reminderTime.getHours() -1);

        if (date.getTime() === reminderTime.getTime()) {
            const subject = "Appointment Reminder";
            const userText = "You have an appointment tomorrow at ${appointment.timeSlot} with Dr. ${appointment.doctorInfo.username}.";
            const doctorText = "You have an appointment tomorrow at ${appointment.timeSlot} with ${appointment.userInfo.username}."
            await emailService(userEmail, subject, userText);
            await emailService(doctorEmail, subject, doctorText);
        }
    });
};

cron.schedule("0 * * * * *", sendAppointmentReminders);

app.listen(3000, () => {
    console.log("Server running on 3000");
});
