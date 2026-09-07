const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const router = express.Router();

// Register Page

router.get("/register", (req, res) => {

    res.render("register");

});

//register user

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        // Check required fields

        if (
            !name ||
            !email ||
            !password ||
            !role
        ) {

            return res.send(
                "All fields are required!"
            );

        }


        // Check valid role

        if (
            !["student", "teacher"].includes(role)
        ) {

            return res.send(
                "Invalid role!"
            );

        }


        // Check existing user

        const existingUser =
            await User.findOne({

                email:
                    email
                        .trim()
                        .toLowerCase()

            });


        if (existingUser) {

            return res.send(
                "Email already registered!"
            );

        }


        // Hash password

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // Create user

        const user =
            new User({

                name:
                    name.trim(),

                email:
                    email
                        .trim()
                        .toLowerCase(),

                password:
                    hashedPassword,

                role

            });


        // Save user

        await user.save();


        // Redirect to login

        res.redirect("/login");


    } catch (err) {

        console.log(
            "Register error:",
            err.message
        );

        res.send(
            "Registration failed!"
        );

    }

});

// Login Page

router.get("/login", (req, res) => {

    res.render("login");

});

// Login User

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Find user

        const user =
            await User.findOne({

                email:
                    email
                        .trim()
                        .toLowerCase()

            });


        if (!user) {

            return res.send(
                "Invalid email or password!"
            );

        }


        // Compare password

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.send(
                "Invalid email or password!"
            );

        }


        // Store user information in session

        req.session.userId =
            user._id;

        req.session.userRole =
            user.role;

        req.session.userName =
            user.name;


        // Redirect according to role

        if (
            user.role === "teacher"
        ) {

            return res.redirect(
                "/teacher/dashboard"
            );

        }


        res.redirect(
            "/student/dashboard"
        );


    } catch (err) {

        console.log(
            "Login error:",
            err.message
        );

        res.send(
            "Login failed!"
        );

    }

});



// Logout User


router.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.log(
                "Logout error:",
                err.message
            );

        }


        res.redirect("/login");

    });

});


module.exports = router;