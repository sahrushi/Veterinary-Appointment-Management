const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, text) => {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "mandapati20100@iiitnr.edu.in",
            pass: "Sahrushi2645?"
        }
    });

    let mailOptions = {
        from: "mandapati20100@iiitnr.edu.in",
        to: email,
        subject: subject,
        text: text
    };

    await transporter.sendMail(mailOptions, (error, info) => {
        if(error) {
            console.log(error);
        } else {
            console.log("Email sent: "+ info.response);
        }
    });
};

module.exports = sendEmail;