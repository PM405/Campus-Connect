const express = require("express");
const mongoose = require("mongoose");
const Course = require("../models/Course");
const CourseRequest = require("../models/CourseRequest");
const Assignment = require("../models/Assignment");
const Material = require("../models/Material");
const Notice = require("../models/Notice");
const upload = require("../middleware/upload");

const router = express.Router();

function requireStudent(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    if (req.session.userRole !== "student") {
        return res.redirect("/");
    }

    next();
}


/* Student Dashboard */

router.get(
    "/student/dashboard",
    requireStudent,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    students:
                        req.session.userId
                })
                    .populate("teacher")
                    .sort({
                        createdAt: -1
                    });

            const courseIds =
                courses.map(
                    course => course._id
                );


            const pendingRequests =
                await CourseRequest.find({
                    student:
                        req.session.userId,

                    status: "pending"
                })
                    .populate(
                        "course",
                        "courseName subject courseKey startDate endDate"
                    )
                    .sort({
                        requestedAt: -1
                    });


            const materials =
                await Material.find({
                    course: {
                        $in: courseIds
                    }
                })
                    .populate("course")
                    .sort({
                        createdAt: -1
                    });


            const assignments =
                await Assignment.find({
                    course: {
                        $in: courseIds
                    }
                })
                    .populate("course")
                    .sort({
                        dueDate: 1
                    });


            const notices =
                await Notice.find({
                    course: {
                        $in: courseIds
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
                        createdAt: -1
                    });


            const noticeCount =
                notices.length;


            res.render(
                "student-dashboard",
                {
                    userName:
                        req.session.userName,

                    courses,

                    materials,

                    assignments,

                    notices,

                    noticeCount,

                    pendingRequests
                }
            );

        } catch (err) {

            console.log(
                "Student dashboard error:",
                err.message
            );

            res.send(
                "Unable to load student dashboard."
            );
        }
    }
);


/* Join Course Page */

router.get(
    "/student/courses/join",
    requireStudent,
    (req, res) => {

        res.render("join-course");

    }
);


/* Send Course Join Request */

router.post(
    "/student/courses/join",
    requireStudent,
    async (req, res) => {

        try {

            const courseKey =
                req.body.courseKey
                    ? req.body.courseKey
                        .trim()
                        .toUpperCase()
                    : "";


            if (!courseKey) {

                return res.send(
                    "Course key is required!"
                );

            }


            const course =
                await Course.findOne({
                    courseKey
                });


            if (!course) {

                return res.send(
                    "Invalid course key!"
                );

            }


            if (
                new Date() >
                new Date(course.endDate)
            ) {

                return res.send(
                    "This course has already expired."
                );

            }


            const alreadyJoined =
                course.students.some(
                    studentId =>
                        studentId.toString() ===
                        req.session.userId.toString()
                );


            if (alreadyJoined) {

                return res.redirect(
                    "/student/dashboard"
                );

            }


            const existingRequest =
                await CourseRequest.findOne({

                    student:
                        req.session.userId,

                    course:
                        course._id

                });


            if (existingRequest) {

                if (
                    existingRequest.status ===
                    "pending"
                ) {

                    return res.redirect(
                        "/student/dashboard"
                    );

                }


                if (
                    existingRequest.status ===
                    "accepted"
                ) {

                    return res.redirect(
                        "/student/dashboard"
                    );

                }


                if (
                    existingRequest.status ===
                    "rejected"
                ) {

                    existingRequest.status =
                        "pending";

                    existingRequest.requestedAt =
                        new Date();

                    await existingRequest.save();

                    return res.redirect(
                        "/student/dashboard"
                    );

                }

            }


            const request =
                new CourseRequest({

                    student:
                        req.session.userId,

                    course:
                        course._id,

                    status:
                        "pending"

                });


            await request.save();


            res.redirect(
                "/student/dashboard"
            );


        } catch (err) {

            console.log(
                "Course request error:",
                err.message
            );

            res.send(
                "Unable to send course join request."
            );
        }
    }
);


/* Student Assignments */

router.get(
    "/student/assignments",
    requireStudent,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    students:
                        req.session.userId
                });


            const courseIds =
                courses.map(
                    course => course._id
                );


            const assignments =
                await Assignment.find({
                    course: {
                        $in: courseIds
                    }
                })
                    .populate("course")
                    .sort({
                        dueDate: 1
                    });


            res.render(
                "student-assignments",
                {
                    assignments,

                    userName:
                        req.session.userName
                }
            );

        } catch (err) {

            console.log(
                "Student assignments error:",
                err.message
            );

            res.send(
                "Unable to load assignments."
            );
        }
    }
);


/* Assignment Details */

router.get(
    "/student/assignments/:assignmentId",
    requireStudent,
    async (req, res) => {

        try {

            const {
                assignmentId
            } = req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    assignmentId
                )
            ) {

                return res.send(
                    "Invalid assignment ID."
                );

            }


            const assignment =
                await Assignment.findById(
                    assignmentId
                )
                    .populate("course")
                    .populate(
                        "teacher",
                        "name email"
                    );


            if (!assignment) {

                return res.send(
                    "Assignment not found."
                );

            }


            const course =
                assignment.course;


            if (!course) {

                return res.send(
                    "Course not found."
                );

            }


            const isStudent =
                course.students.some(
                    studentId =>
                        studentId.toString() ===
                        req.session.userId.toString()
                );


            if (!isStudent) {

                return res.send(
                    "You are not enrolled in this course."
                );

            }


            if (
                new Date() >
                new Date(course.endDate)
            ) {

                return res.send(
                    "This course has expired."
                );

            }


            const submission =
                assignment.submissions.find(
                    submission =>
                        submission.student.toString() ===
                        req.session.userId.toString()
                );


            res.render(
                "view-assignment",
                {
                    assignment,

                    submission,

                    userName:
                        req.session.userName
                }
            );


        } catch (err) {

            console.log(
                "View assignment error:",
                err.message
            );

            res.send(
                "Unable to load assignment."
            );
        }
    }
);


/* Submit Assignment */

router.post(
    "/student/assignments/:assignmentId/submit",
    requireStudent,
    upload.single("file"),
    async (req, res) => {

        try {

            const {
                assignmentId
            } = req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    assignmentId
                )
            ) {

                return res.send(
                    "Invalid assignment ID."
                );

            }


            const assignment =
                await Assignment.findById(
                    assignmentId
                )
                    .populate("course");


            if (!assignment) {

                return res.send(
                    "Assignment not found."
                );

            }


            const course =
                assignment.course;


            if (!course) {

                return res.send(
                    "Course not found."
                );

            }


            const isStudent =
                course.students.some(
                    studentId =>
                        studentId.toString() ===
                        req.session.userId.toString()
                );


            if (!isStudent) {

                return res.send(
                    "You are not enrolled in this course."
                );

            }


            if (
                new Date() >
                new Date(course.endDate)
            ) {

                return res.send(
                    "This course has expired."
                );

            }


            if (
                new Date() >
                new Date(assignment.dueDate)
            ) {

                return res.send(
                    "Assignment submission deadline has passed."
                );

            }


            if (!req.file) {

                return res.send(
                    "Please select a file to upload."
                );

            }


            const existingSubmission =
                assignment.submissions.find(
                    submission =>
                        submission.student.toString() ===
                        req.session.userId.toString()
                );


            if (existingSubmission) {

                existingSubmission.fileName =
                    req.file.originalname;

                existingSubmission.filePath =
                    "/uploads/" +
                    req.file.filename;

                existingSubmission.submittedAt =
                    new Date();

            } else {

                assignment.submissions.push({

                    student:
                        req.session.userId,

                    fileName:
                        req.file.originalname,

                    filePath:
                        "/uploads/" +
                        req.file.filename,

                    submittedAt:
                        new Date()
                });

            }


            await assignment.save();


            res.redirect(
                `/student/assignments/${assignmentId}`
            );


        } catch (err) {

            console.log(
                "Assignment submission error:",
                err.message
            );

            res.send(
                "Unable to submit assignment."
            );
        }
    }
);


module.exports = router;