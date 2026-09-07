const express = require("express");
const mongoose = require("mongoose");

const Course = require("../models/Course");
const Assignment = require("../models/Assignment");
const Material = require("../models/Material");
const Quiz = require("../models/Quiz");
const Discussion = require("../models/Discussion");

const router = express.Router();


function requireLogin(req, res, next) {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}


function isCourseExpired(course) {

    return new Date() > new Date(
        course.endDate
    );

}


router.get(
    "/course/:courseId",
    requireLogin,
    async (req, res) => {

        try {

            const {
                courseId
            } = req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    courseId
                )
            ) {

                return res.send(
                    "Invalid course ID."
                );

            }


            const course =
                await Course.findById(
                    courseId
                )
                    .populate(
                        "teacher",
                        "name email"
                    )
                    .populate(
                        "students",
                        "name email"
                    );


            if (!course) {

                return res.send(
                    "Course not found."
                );

            }


            const userId =
                req.session.userId.toString();


            const isTeacher =
                course.teacher &&
                course.teacher._id.toString() ===
                userId;


            const isStudent =
                course.students.some(
                    student =>
                        student._id.toString() ===
                        userId
                );


            if (!isTeacher && !isStudent) {

                return res.send(
                    "You are not authorized to view this course."
                );

            }


            const assignments =
                await Assignment.find({
                    course: courseId
                })
                    .sort({
                        dueDate: 1
                    });


            const materials =
                await Material.find({
                    course: courseId
                })
                    .sort({
                        createdAt: -1
                    });


            const quizzes =
                await Quiz.find({
                    course: courseId
                })
                    .sort({
                        createdAt: -1
                    });


            const discussions =
                await Discussion.find({
                    course: courseId
                })
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
                "course-details",
                {
                    course,
                    assignments,
                    materials,
                    quizzes,
                    discussions,
                    isTeacher,
                    isStudent,
                    expired:
                        isCourseExpired(course),
                    userName:
                        req.session.userName
                }
            );


        } catch (err) {

            console.log(
                "Course details error:",
                err.message
            );

            res.send(
                "Unable to load course."
            );

        }

    }
);


module.exports = router;