const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Course = require("../models/Course");

const router = express.Router();

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

router.get(
    "/teacher/messages",
    requireTeacher,
    async (req, res) => {
        try {
            const courses = await Course.find({
                teacher: req.session.userId
            }).populate(
                "students",
                "name email"
            );

            const courseIds = courses.map(
                course => course._id
            );

            const messages =
                await Message.find({
                    course: {
                        $in: courseIds
                    }
                })
                    .populate(
                        "sender",
                        "name email role"
                    )
                    .populate(
                        "receiver",
                        "name email role"
                    )
                    .populate(
                        "course",
                        "courseName subject"
                    )
                    .sort({
                        createdAt: -1
                    });

            res.render(
                "teacher-messages",
                {
                    courses,
                    messages,
                    userName:
                        req.session.userName,
                    userId:
                        req.session.userId.toString()
                }
            );
        } catch (err) {
            console.log(
                "Teacher messages error:",
                err.message
            );

            res.send(
                "Unable to load messages."
            );
        }
    }
);

router.get(
    "/teacher/messages/:studentId/:courseId",
    requireTeacher,
    async (req, res) => {
        try {
            const {
                studentId,
                courseId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    studentId
                ) ||
                !mongoose.Types.ObjectId.isValid(
                    courseId
                )
            ) {
                return res.send(
                    "Invalid ID."
                );
            }

            const course =
                await Course.findOne({
                    _id: courseId,
                    teacher:
                        req.session.userId,
                    students: studentId
                })
                    .populate(
                        "students",
                        "name email"
                    );

            if (!course) {
                return res.send(
                    "You are not authorized."
                );
            }

            const messages =
                await Message.find({
                    course: courseId,
                    $or: [
                        {
                            sender:
                                studentId,
                            receiver:
                                req.session.userId
                        },
                        {
                            sender:
                                req.session.userId,
                            receiver:
                                studentId
                        }
                    ]
                })
                    .populate(
                        "sender",
                        "name"
                    )
                    .populate(
                        "receiver",
                        "name"
                    )
                    .sort({
                        createdAt: 1
                    });

            const student =
                course.students.find(
                    student =>
                        student._id.toString() ===
                        studentId
                );

            await Message.updateMany(
                {
                    course: courseId,
                    sender: studentId,
                    receiver:
                        req.session.userId
                },
                {
                    $set: {
                        isRead: true
                    }
                }
            );

            res.render(
                "message-conversation",
                {
                    course,
                    student,
                    messages,
                    userName:
                        req.session.userName,
                    userId:
                        req.session.userId.toString()
                }
            );
        } catch (err) {
            console.log(
                "Conversation error:",
                err.message
            );

            res.send(
                "Unable to load conversation."
            );
        }
    }
);

router.post(
    "/teacher/messages/send",
    requireTeacher,
    async (req, res) => {
        try {
            const {
                studentId,
                courseId,
                message
            } = req.body;

            if (
                !studentId ||
                !courseId ||
                !message ||
                !message.trim()
            ) {
                return res.send(
                    "Message cannot be empty."
                );
            }

            const course =
                await Course.findOne({
                    _id: courseId,
                    teacher:
                        req.session.userId,
                    students: studentId
                });

            if (!course) {
                return res.send(
                    "Student is not enrolled in this course."
                );
            }

            const newMessage =
                new Message({
                    sender:
                        req.session.userId,
                    receiver:
                        studentId,
                    course:
                        courseId,
                    message:
                        message.trim()
                });

            await newMessage.save();

            res.redirect(
                `/teacher/messages/${studentId}/${courseId}`
            );
        } catch (err) {
            console.log(
                "Teacher send message error:",
                err.message
            );

            res.send(
                "Message could not be sent."
            );
        }
    }
);

router.get(
    "/student/messages/:teacherId/:courseId",
    requireStudent,
    async (req, res) => {
        try {
            const {
                teacherId,
                courseId
            } = req.params;

            const course =
                await Course.findOne({
                    _id: courseId,
                    teacher: teacherId,
                    students:
                        req.session.userId
                })
                    .populate(
                        "teacher",
                        "name email"
                    );

            if (!course) {
                return res.send(
                    "You are not authorized."
                );
            }

            const messages =
                await Message.find({
                    course: courseId,
                    $or: [
                        {
                            sender:
                                req.session.userId,
                            receiver:
                                teacherId
                        },
                        {
                            sender:
                                teacherId,
                            receiver:
                                req.session.userId
                        }
                    ]
                })
                    .populate(
                        "sender",
                        "name"
                    )
                    .populate(
                        "receiver",
                        "name"
                    )
                    .sort({
                        createdAt: 1
                    });

            await Message.updateMany(
                {
                    course: courseId,
                    sender: teacherId,
                    receiver:
                        req.session.userId
                },
                {
                    $set: {
                        isRead: true
                    }
                }
            );

            res.render(
                "message-conversation",
                {
                    course,
                    student: null,
                    teacher:
                        course.teacher,
                    messages,
                    userName:
                        req.session.userName,
                    userId:
                        req.session.userId.toString()
                }
            );
        } catch (err) {
            console.log(
                "Student conversation error:",
                err.message
            );

            res.send(
                "Unable to load conversation."
            );
        }
    }
);

router.post(
    "/student/messages/send",
    requireStudent,
    async (req, res) => {
        try {
            const {
                teacherId,
                courseId,
                message
            } = req.body;

            if (
                !teacherId ||
                !courseId ||
                !message ||
                !message.trim()
            ) {
                return res.send(
                    "Message cannot be empty."
                );
            }

            const course =
                await Course.findOne({
                    _id: courseId,
                    teacher: teacherId,
                    students:
                        req.session.userId
                });

            if (!course) {
                return res.send(
                    "You are not enrolled in this course."
                );
            }

            const newMessage =
                new Message({
                    sender:
                        req.session.userId,
                    receiver:
                        teacherId,
                    course:
                        courseId,
                    message:
                        message.trim()
                });

            await newMessage.save();

            res.redirect(
                `/student/messages/${teacherId}/${courseId}`
            );
        } catch (err) {
            console.log(
                "Student send message error:",
                err.message
            );

            res.send(
                "Message could not be sent."
            );
        }
    }
);

module.exports = router;