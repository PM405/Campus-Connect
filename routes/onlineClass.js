const express = require("express");
const mongoose = require("mongoose");

const OnlineClass = require("../models/OnlineClass");
const Course = require("../models/Course");

const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

function requireTeacher(req, res, next) {
    if (
        !req.session.userId ||
        req.session.userRole !== "teacher"
    ) {
        return res.redirect("/login");
    }

    next();
}

function requireStudent(req, res, next) {
    if (
        !req.session.userId ||
        req.session.userRole !== "student"
    ) {
        return res.redirect("/login");
    }

    next();
}


// Teacher Online Classes
router.get(
    "/teacher/online-classes",
    requireTeacher,
    async (req, res) => {
        try {
            const courses =
                await Course.find({
                    teacher: req.session.userId
                }).sort({
                    courseName: 1
                });

            const courseIds =
                courses.map(
                    course => course._id
                );

            const onlineClasses =
                await OnlineClass.find({
                    course: {
                        $in: courseIds
                    }
                })
                    .populate(
                        "course",
                        "courseName subject"
                    )
                    .sort({
                        scheduledAt: 1
                    });

            res.render(
                "teacher-online-classes",
                {
                    courses,
                    onlineClasses,
                    userName:
                        req.session.userName
                }
            );
        } catch (err) {
            console.log(
                "Teacher online classes error:",
                err.message
            );

            res.send(
                "Unable to load online classes."
            );
        }
    }
);


// Create Online Class Page
router.get(
    "/teacher/online-classes/create",
    requireTeacher,
    async (req, res) => {
        try {
            const courses =
                await Course.find({
                    teacher: req.session.userId
                }).sort({
                    courseName: 1
                });

            res.render(
                "create-online-class",
                {
                    courses,
                    userName:
                        req.session.userName
                }
            );
        } catch (err) {
            console.log(
                "Create online class page error:",
                err.message
            );

            res.send(
                "Unable to load page."
            );
        }
    }
);


// Create Online Class
router.post(
    "/teacher/online-classes/create",
    requireTeacher,
    async (req, res) => {
        try {
            const {
                title,
                courseId,
                scheduledAt
            } = req.body;

            if (
                !title ||
                !courseId ||
                !scheduledAt
            ) {
                return res.send(
                    "All fields are required."
                );
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    courseId
                )
            ) {
                return res.send(
                    "Invalid course."
                );
            }

            const course =
                await Course.findOne({
                    _id: courseId,
                    teacher:
                        req.session.userId
                });

            if (!course) {
                return res.send(
                    "You are not authorized for this course."
                );
            }

            const randomCode =
                Math.random()
                    .toString(36)
                    .substring(2, 10)
                    .toUpperCase();

            const roomName =
                `CampusConnect-${randomCode}`;

            const meetingLink =
                `https://meet.jit.si/${roomName}`;

            const onlineClass =
                new OnlineClass({
                    title:
                        title.trim(),
                    course:
                        course._id,
                    teacher:
                        req.session.userId,
                    roomName,
                    meetingLink,
                    scheduledAt:
                        new Date(scheduledAt),
                    status:
                        "scheduled"
                });

            await onlineClass.save();

            res.redirect(
                "/teacher/online-classes"
            );
        } catch (err) {
            console.log(
                "Create online class error:",
                err.message
            );

            res.send(
                "Online class creation failed."
            );
        }
    }
);


// Start Online Class
router.post(
    "/teacher/online-classes/:classId/start",
    requireTeacher,
    async (req, res) => {
        try {
            const {
                classId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    classId
                )
            ) {
                return res.send(
                    "Invalid class ID."
                );
            }

            const onlineClass =
                await OnlineClass.findOne({
                    _id: classId,
                    teacher:
                        req.session.userId
                });

            if (!onlineClass) {
                return res.send(
                    "Online class not found."
                );
            }

            onlineClass.status =
                "live";

            await onlineClass.save();

            res.redirect(
                onlineClass.meetingLink
            );
        } catch (err) {
            console.log(
                "Start online class error:",
                err.message
            );

            res.send(
                "Unable to start online class."
            );
        }
    }
);


// End Online Class
router.post(
    "/teacher/online-classes/:classId/end",
    requireTeacher,
    async (req, res) => {
        try {
            const {
                classId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    classId
                )
            ) {
                return res.send(
                    "Invalid class ID."
                );
            }

            const onlineClass =
                await OnlineClass.findOne({
                    _id: classId,
                    teacher:
                        req.session.userId
                });

            if (!onlineClass) {
                return res.send(
                    "Online class not found."
                );
            }

            onlineClass.status =
                "ended";

            await onlineClass.save();

            res.redirect(
                "/teacher/online-classes"
            );
        } catch (err) {
            console.log(
                "End online class error:",
                err.message
            );

            res.send(
                "Unable to end online class."
            );
        }
    }
);


// Student Online Classes
router.get(
    "/student/online-classes",
    requireStudent,
    async (req, res) => {
        try {
            const courses =
                await Course.find({
                    students:
                        req.session.userId
                }).populate(
                    "teacher",
                    "name"
                );

            const courseIds =
                courses.map(
                    course => course._id
                );

            const onlineClasses =
                await OnlineClass.find({
                    course: {
                        $in: courseIds
                    },
                    status: {
                        $ne: "ended"
                    }
                })
                    .populate(
                        "course",
                        "courseName subject"
                    )
                    .populate(
                        "teacher",
                        "name"
                    )
                    .sort({
                        scheduledAt: 1
                    });

            res.render(
                "student-online-classes",
                {
                    courses,
                    onlineClasses,
                    userName:
                        req.session.userName
                }
            );
        } catch (err) {
            console.log(
                "Student online classes error:",
                err.message
            );

            res.send(
                "Unable to load online classes."
            );
        }
    }
);


// Student Join Online Class
router.get(
    "/student/online-classes/:classId/join",
    requireStudent,
    async (req, res) => {
        try {
            const {
                classId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    classId
                )
            ) {
                return res.send(
                    "Invalid class ID."
                );
            }

            const onlineClass =
                await OnlineClass.findById(
                    classId
                );

            if (!onlineClass) {
                return res.send(
                    "Online class not found."
                );
            }

            const course =
                await Course.findOne({
                    _id:
                        onlineClass.course,
                    students:
                        req.session.userId
                });

            if (!course) {
                return res.send(
                    "You are not enrolled in this course."
                );
            }

            if (
                onlineClass.status ===
                "ended"
            ) {
                return res.send(
                    "This online class has ended."
                );
            }

            res.redirect(
                onlineClass.meetingLink
            );
        } catch (err) {
            console.log(
                "Join online class error:",
                err.message
            );

            res.send(
                "Unable to join online class."
            );
        }
    }
);


module.exports = router;