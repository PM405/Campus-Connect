const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User");

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

router.get("/register", (req, res) => {
    res.render("register");
});

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role
        } = req.body;

        if (!name || !email || !password || !role) {
            return res.send("All fields are required!");
        }

        if (!["student", "teacher"].includes(role)) {
            return res.send("Invalid role!");
        }

        const cleanEmail =
            email.trim().toLowerCase();

        const existingUser =
            await User.findOne({
                email: cleanEmail
            });

        if (existingUser) {
            return res.send(
                "Email already registered!"
            );
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const user = new User({
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            role,
            isFirstLogin: true
        });

        await user.save();

        res.redirect("/login");
    } catch (err) {
        console.log(
            "Register error:",
            err.message
        );

        res.send("Registration failed!");
    }
});

router.get("/login", (req, res) => {
    res.render("login", {
        resetSuccess:
            req.query.reset === "success"
    });
});

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.send(
                "Email and password are required!"
            );
        }

        const cleanEmail =
            email.trim().toLowerCase();

        const user =
            await User.findOne({
                email: cleanEmail
            });

        if (!user) {
            return res.send(
                "Invalid email or password!"
            );
        }

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

        req.session.userId = user._id;
        req.session.userRole = user.role;
        req.session.userName = user.name;

        if (user.role === "teacher") {
            return res.redirect(
                "/teacher/dashboard"
            );
        }

        res.redirect("/student/dashboard");
    } catch (err) {
        console.log(
            "Login error:",
            err.message
        );

        res.send("Login failed!");
    }
});

router.get(
    "/forgot-password",
    (req, res) => {
        res.render("forgot-password");
    }
);

router.post(
    "/forgot-password",
    async (req, res) => {
        try {
            const email =
                req.body.email
                    .trim()
                    .toLowerCase();

            if (!email) {
                return res.send(
                    "Please enter your email."
                );
            }

            const user =
                await User.findOne({
                    email
                });

            if (!user) {
                return res.render(
                    "forgot-password",
                    {
                        message:
                            "If this email is registered, a password reset link has been sent."
                    }
                );
            }

            const resetToken =
                crypto.randomBytes(32).toString(
                    "hex"
                );

            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(resetToken)
                    .digest("hex");

            user.resetPasswordToken =
                hashedToken;

            user.resetPasswordExpires =
                Date.now() +
                15 * 60 * 1000;

            await user.save();

            const resetUrl =
                `${process.env.APP_URL}/reset-password/${resetToken}`;

            await transporter.sendMail({
                from: `"CampusConnect" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject:
                    "CampusConnect - Password Reset",
                html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                        border: 1px solid #ddd;
                        border-radius: 12px;
                    ">
                        <h2 style="text-align:center;">
                            CampusConnect
                        </h2>

                        <h3>
                            Password Reset Request
                        </h3>

                        <p>
                            Hello ${user.name},
                        </p>

                        <p>
                            We received a request to reset
                            your CampusConnect password.
                        </p>

                        <p>
                            Click the button below to
                            create a new password.
                        </p>

                        <div style="
                            text-align:center;
                            margin:30px 0;
                        ">
                            <a href="${resetUrl}"
                               style="
                               background:#2563eb;
                               color:white;
                               padding:12px 25px;
                               text-decoration:none;
                               border-radius:8px;
                               display:inline-block;
                               ">
                                Reset Password
                            </a>
                        </div>

                        <p>
                            This link will expire in
                            <strong>15 minutes</strong>.
                        </p>

                        <p>
                            If you did not request this,
                            you can safely ignore this email.
                        </p>

                        <hr>

                        <p style="
                            color:#777;
                            font-size:13px;
                        ">
                            CampusConnect Student &
                            Faculty Collaboration Portal
                        </p>
                    </div>
                `
            });

            res.render(
                "forgot-password",
                {
                    message:
                        "If this email is registered, a password reset link has been sent."
                }
            );
        } catch (err) {
            console.log(
                "Forgot password error:",
                err.message
            );

            res.send(
                "Unable to process password reset request."
            );
        }
    }
);

router.get(
    "/reset-password/:token",
    async (req, res) => {
        try {
            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(req.params.token)
                    .digest("hex");

            const user =
                await User.findOne({
                    resetPasswordToken:
                        hashedToken,
                    resetPasswordExpires: {
                        $gt: Date.now()
                    }
                });

            if (!user) {
                return res.send(
                    "Password reset link is invalid or expired."
                );
            }

            res.render(
                "reset-password",
                {
                    token: req.params.token
                }
            );
        } catch (err) {
            console.log(
                "Reset page error:",
                err.message
            );

            res.send(
                "Unable to open reset page."
            );
        }
    }
);

router.post(
    "/reset-password/:token",
    async (req, res) => {
        try {
            const {
                password,
                confirmPassword
            } = req.body;

            if (!password || !confirmPassword) {
                return res.send(
                    "All fields are required."
                );
            }

            if (password.length < 6) {
                return res.send(
                    "Password must be at least 6 characters."
                );
            }

            if (password !== confirmPassword) {
                return res.send(
                    "Passwords do not match."
                );
            }

            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(req.params.token)
                    .digest("hex");

            const user =
                await User.findOne({
                    resetPasswordToken:
                        hashedToken,
                    resetPasswordExpires: {
                        $gt: Date.now()
                    }
                });

            if (!user) {
                return res.send(
                    "Password reset link is invalid or expired."
                );
            }

            user.password =
                await bcrypt.hash(
                    password,
                    10
                );

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;

            await user.save();

            res.redirect(
                "/login?reset=success"
            );
        } catch (err) {
            console.log(
                "Reset password error:",
                err.message
            );

            res.send(
                "Unable to reset password."
            );
        }
    }
);

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