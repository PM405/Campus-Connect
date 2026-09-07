const express = require("express");
const mongoose = require("mongoose");

const Discussion = require("../models/Discussion");
const Course = require("../models/Course");

const router = express.Router();


function requireLogin(req, res, next) {

    if (!req.session.userId) {
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
    "/student/discussions",
    requireStudent,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    students:
                        req.session.userId
                })
                    .populate(
                        "teacher",
                        "name"
                    )
                    .sort({
                        courseName: 1
                    });


            const courseIds =
                courses.map(
                    course =>
                        course._id
                );


            const discussions =
                await Discussion.find({
                    course: {
                        $in: courseIds
                    }
                })
                    .populate(
                        "course",
                        "courseName subject"
                    )
                    .populate(
                        "student",
                        "name email"
                    )
                    .populate(
                        "replies.student",
                        "name"
                    )
                    .populate(
                        "replies.teacher",
                        "name"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.render(
                "student-discussions",
                {
                    courses,
                    discussions,
                    userName:
                        req.session.userName
                }
            );


        } catch (err) {

            console.log(
                "Discussion list error:",
                err.message
            );

            res.send(
                "Unable to load discussions."
            );

        }

    }
);


router.get(
    "/student/discussions/create",
    requireStudent,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    students:
                        req.session.userId
                })
                    .sort({
                        courseName: 1
                    });


            res.render(
                "create-discussion",
                {
                    courses,
                    userName:
                        req.session.userName
                }
            );


        } catch (err) {

            console.log(
                "Create discussion page error:",
                err.message
            );

            res.send(
                "Unable to load page."
            );

        }

    }
);


router.post(
    "/student/discussions/create",
    requireStudent,
    async (req, res) => {

        try {

            const {
                title,
                description,
                courseId
            } = req.body;


            if (
                !title ||
                !description ||
                !courseId
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
                    students:
                        req.session.userId
                });


            if (!course) {

                return res.send(
                    "You are not enrolled in this course."
                );

            }


            const discussion =
                new Discussion({
                    title:
                        title.trim(),

                    description:
                        description.trim(),

                    course:
                        course._id,

                    student:
                        req.session.userId
                });


            await discussion.save();


            res.redirect(
                `/course/${course._id}#discussions`
            );


        } catch (err) {

            console.log(
                "Create discussion error:",
                err.message
            );

            res.send(
                "Discussion creation failed."
            );

        }

    }
);


router.get(
    "/discussions/:discussionId",
    requireLogin,
    async (req, res) => {

        try {

            const {
                discussionId
            } = req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    discussionId
                )
            ) {

                return res.send(
                    "Invalid discussion ID."
                );

            }


            const discussion =
                await Discussion.findById(
                    discussionId
                )
                    .populate(
                        "course",
                        "courseName subject students teacher"
                    )
                    .populate(
                        "student",
                        "name email"
                    )
                    .populate(
                        "replies.student",
                        "name"
                    )
                    .populate(
                        "replies.teacher",
                        "name"
                    );


            if (!discussion) {

                return res.send(
                    "Discussion not found."
                );

            }


            const userId =
                req.session.userId.toString();


            const isStudent =
                discussion.course.students.some(
                    student =>
                        student.toString() ===
                        userId
                );


            const isTeacher =
                discussion.course.teacher &&
                discussion.course.teacher.toString() ===
                userId;


            if (
                !isStudent &&
                !isTeacher
            ) {

                return res.send(
                    "You are not authorized."
                );

            }


            res.render(
                "discussion-details",
                {
                    discussion,
                    isTeacher,
                    isStudent,
                    userName:
                        req.session.userName
                }
            );


        } catch (err) {

            console.log(
                "Discussion details error:",
                err.message
            );

            res.send(
                "Unable to load discussion."
            );

        }

    }
);


router.post(
    "/discussions/:discussionId/reply",
    requireLogin,
    async (req, res) => {

        try {

            const {
                discussionId
            } = req.params;


            const {
                message
            } = req.body;


            if (
                !message ||
                !message.trim()
            ) {

                return res.send(
                    "Reply cannot be empty."
                );

            }


            if (
                !mongoose.Types.ObjectId.isValid(
                    discussionId
                )
            ) {

                return res.send(
                    "Invalid discussion ID."
                );

            }


            const discussion =
                await Discussion.findById(
                    discussionId
                );


            if (!discussion) {

                return res.send(
                    "Discussion not found."
                );

            }


            const course =
                await Course.findById(
                    discussion.course
                );


            if (!course) {

                return res.send(
                    "Course not found."
                );

            }


            const userId =
                req.session.userId.toString();


            const isStudent =
                course.students.some(
                    student =>
                        student.toString() ===
                        userId
                );


            const isTeacher =
                course.teacher &&
                course.teacher.toString() ===
                userId;


            if (
                !isStudent &&
                !isTeacher
            ) {

                return res.send(
                    "You are not authorized to reply."
                );

            }


            if (isTeacher) {

                discussion.replies.push({
                    teacher:
                        req.session.userId,

                    message:
                        message.trim()
                });

            } else {

                discussion.replies.push({
                    student:
                        req.session.userId,

                    message:
                        message.trim()
                });

            }


            await discussion.save();


            res.redirect(
                `/discussions/${discussionId}`
            );


        } catch (err) {

            console.log(
                "Discussion reply error:",
                err.message
            );

            res.send(
                "Unable to add reply."
            );

        }

    }
);


module.exports = router;