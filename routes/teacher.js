const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseRequest = require("../models/CourseRequest");
const Assignment = require("../models/Assignment");
const Material = require("../models/Material");
const Quiz = require("../models/Quiz");

const router = express.Router();

function requireTeacher(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    if (req.session.userRole !== "teacher") {
        return res.redirect("/");
    }

    next();
}

function generateCourseKey() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let key = "";

    key += letters[
        Math.floor(
            Math.random() * letters.length
        )
    ];

    key += letters[
        Math.floor(
            Math.random() * letters.length
        )
    ];

    key += Math.floor(
        1000 + Math.random() * 9000
    );

    return key;
}

async function createUniqueCourseKey() {
    let courseKey;
    let existingCourse;

    do {
        courseKey = generateCourseKey();

        existingCourse =
            await Course.findOne({
                courseKey
            });

    } while (existingCourse);

    return courseKey;
}

function isCourseExpired(course) {
    return new Date() >
        new Date(course.endDate);
}

function isCourseStarted(course) {
    return new Date() >=
        new Date(course.startDate);
}

function isCourseActive(course) {
    const now = new Date();

    return (
        now >= new Date(course.startDate) &&
        now <= new Date(course.endDate)
    );
}


/* Teacher Dashboard */

router.get(
    "/teacher/dashboard",
    requireTeacher,
    async (req, res) => {
        try {

            const courses =
                await Course.find({
                    teacher:
                        req.session.userId
                })
                    .populate(
                        "teacher",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });

            const studentIds = [];

            courses.forEach(course => {
                course.students.forEach(
                    studentId => {

                        const id =
                            studentId.toString();

                        if (
                            !studentIds.includes(id)
                        ) {
                            studentIds.push(id);
                        }
                    }
                );
            });

            const assignments =
                await Assignment.find({
                    teacher:
                        req.session.userId
                });

            const materials =
                await Material.find({
                    teacher:
                        req.session.userId
                });

            const quizzes =
                await Quiz.find({
                    teacher:
                        req.session.userId
                });

            const courseIds =
                courses.map(
                    course => course._id
                );

            const joinRequests =
                await CourseRequest.find({
                    course: {
                        $in: courseIds
                    },
                    status: "pending"
                })
                    .populate(
                        "student",
                        "name email"
                    )
                    .populate(
                        "course",
                        "courseName subject courseKey"
                    )
                    .sort({
                        requestedAt: -1
                    });

            const joinRequestCount =
                joinRequests.length;

            res.render(
                "teacher-dashboard",
                {
                    userName:
                        req.session.userName,

                    courses,

                    totalStudents:
                        studentIds.length,

                    assignmentCount:
                        assignments.length,

                    totalAssignments:
                        assignments.length,

                    materialCount:
                        materials.length,

                    totalMaterials:
                        materials.length,

                    quizCount:
                        quizzes.length,

                    totalQuizzes:
                        quizzes.length,

                    joinRequestCount,

                    joinRequests
                }
            );

        } catch (err) {

            console.log(
                "Teacher dashboard error:",
                err.message
            );

            res.send(
                "Unable to load teacher dashboard."
            );
        }
    }
);


/* Create Course Page */

router.get(
    "/teacher/courses/new",
    requireTeacher,
    (req, res) => {

        res.render("add-course");

    }
);


/* Create Course */

router.post(
    "/teacher/courses/new",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                courseName,
                subject,
                startDate,
                endDate
            } = req.body;

            if (
                !courseName ||
                !subject ||
                !startDate ||
                !endDate
            ) {
                return res.send(
                    "All fields are required!"
                );
            }

            const start =
                new Date(startDate);

            const end =
                new Date(endDate);

            if (
                isNaN(start.getTime()) ||
                isNaN(end.getTime())
            ) {
                return res.send(
                    "Invalid date."
                );
            }

            if (end <= start) {
                return res.send(
                    "End date must be after start date."
                );
            }

            const courseKey =
                await createUniqueCourseKey();

            const course =
                new Course({

                    courseName:
                        courseName.trim(),

                    subject:
                        subject.trim(),

                    teacher:
                        req.session.userId,

                    courseKey,

                    students: [],

                    startDate: start,

                    endDate: end
                });

            await course.save();

            res.redirect(
                "/teacher/dashboard"
            );

        } catch (err) {

            console.log(
                "Create course error:",
                err.message
            );

            res.send(
                "Unable to create course."
            );
        }
    }
);


/* Create Course Alternative Route */

router.post(
    "/teacher/courses/create",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                courseName,
                subject,
                startDate,
                endDate
            } = req.body;

            if (
                !courseName ||
                !subject ||
                !startDate ||
                !endDate
            ) {
                return res.send(
                    "All fields are required!"
                );
            }

            const start =
                new Date(startDate);

            const end =
                new Date(endDate);

            if (
                isNaN(start.getTime()) ||
                isNaN(end.getTime())
            ) {
                return res.send(
                    "Invalid date."
                );
            }

            if (end <= start) {
                return res.send(
                    "End date must be after start date."
                );
            }

            const courseKey =
                await createUniqueCourseKey();

            const course =
                new Course({

                    courseName:
                        courseName.trim(),

                    subject:
                        subject.trim(),

                    teacher:
                        req.session.userId,

                    courseKey,

                    students: [],

                    startDate: start,

                    endDate: end
                });

            await course.save();

            res.redirect(
                "/teacher/dashboard"
            );

        } catch (err) {

            console.log(
                "Create course error:",
                err.message
            );

            res.send(
                "Unable to create course."
            );
        }
    }
);


/* View Join Requests */

router.get(
    "/teacher/course-requests",
    requireTeacher,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    teacher:
                        req.session.userId
                }).select("_id");

            const courseIds =
                courses.map(
                    course => course._id
                );

            const requests =
                await CourseRequest.find({

                    course: {
                        $in: courseIds
                    },

                    status: "pending"

                })
                    .populate(
                        "student",
                        "name email"
                    )
                    .populate(
                        "course",
                        "courseName subject courseKey"
                    )
                    .sort({
                        requestedAt: -1
                    });

            res.render(
                "course-requests",
                {
                    requests,

                    userName:
                        req.session.userName
                }
            );

        } catch (err) {

            console.log(
                "Course requests error:",
                err.message
            );

            res.send(
                "Unable to load course requests."
            );
        }
    }
);


/* Accept Join Request */

router.post(
    "/teacher/course-requests/:requestId/accept",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                requestId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    requestId
                )
            ) {
                return res.send(
                    "Invalid request ID."
                );
            }

            const request =
                await CourseRequest.findById(
                    requestId
                )
                    .populate(
                        "student",
                        "name email"
                    )
                    .populate(
                        "course"
                    );

            if (!request) {
                return res.send(
                    "Course request not found."
                );
            }

            const course =
                await Course.findOne({

                    _id:
                        request.course._id,

                    teacher:
                        req.session.userId

                });

            if (!course) {
                return res.send(
                    "Course not found or unauthorized."
                );
            }

            if (
                request.status !==
                "pending"
            ) {
                return res.send(
                    "This request has already been processed."
                );
            }

            const alreadyJoined =
                course.students.some(
                    studentId =>
                        studentId.toString() ===
                        request.student._id.toString()
                );

            if (!alreadyJoined) {

                course.students.push(
                    request.student._id
                );

                await course.save();
            }

            request.status =
                "accepted";

            await request.save();

            res.redirect(
                "/teacher/course-requests"
            );

        } catch (err) {

            console.log(
                "Accept request error:",
                err.message
            );

            res.send(
                "Unable to accept request."
            );
        }
    }
);


/* Reject Join Request */

router.post(
    "/teacher/course-requests/:requestId/reject",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                requestId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    requestId
                )
            ) {
                return res.send(
                    "Invalid request ID."
                );
            }

            const request =
                await CourseRequest.findById(
                    requestId
                ).populate(
                    "course"
                );

            if (!request) {
                return res.send(
                    "Course request not found."
                );
            }

            const course =
                await Course.findOne({

                    _id:
                        request.course._id,

                    teacher:
                        req.session.userId

                });

            if (!course) {
                return res.send(
                    "Course not found or unauthorized."
                );
            }

            if (
                request.status !==
                "pending"
            ) {
                return res.send(
                    "This request has already been processed."
                );
            }

            request.status =
                "rejected";

            await request.save();

            res.redirect(
                "/teacher/course-requests"
            );

        } catch (err) {

            console.log(
                "Reject request error:",
                err.message
            );

            res.send(
                "Unable to reject request."
            );
        }
    }
);


/* Teacher Assignments */

router.get(
    "/teacher/assignments",
    requireTeacher,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    teacher:
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
                "teacher-assignments",
                {
                    assignments,
                    courses,

                    userName:
                        req.session.userName
                }
            );

        } catch (err) {

            console.log(
                "Teacher assignments error:",
                err.message
            );

            res.send(
                "Unable to load assignments."
            );
        }
    }
);


/* Create Assignment Page */

router.get(
    "/teacher/assignments/create",
    requireTeacher,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    teacher:
                        req.session.userId
                })
                    .sort({
                        courseName: 1
                    });

            res.render(
                "create-assignment",
                {
                    courses
                }
            );

        } catch (err) {

            console.log(
                "Create assignment page error:",
                err.message
            );

            res.send(
                "Unable to load page."
            );
        }
    }
);


/* Create Assignment */

router.post(
    "/teacher/assignments/create",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                title,
                description,
                courseId,
                dueDate
            } = req.body;

            if (
                !title ||
                !description ||
                !courseId ||
                !dueDate
            ) {
                return res.send(
                    "All fields are required!"
                );
            }

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
                await Course.findOne({

                    _id: courseId,

                    teacher:
                        req.session.userId

                });

            if (!course) {
                return res.send(
                    "Course not found or unauthorized."
                );
            }

            if (
                isCourseExpired(course)
            ) {
                return res.send(
                    "This course has expired."
                );
            }

            const due =
                new Date(dueDate);

            if (
                isNaN(due.getTime())
            ) {
                return res.send(
                    "Invalid due date."
                );
            }

            if (
                due >
                new Date(course.endDate)
            ) {
                return res.send(
                    "Assignment due date cannot be after course end date."
                );
            }

            const assignment =
                new Assignment({

                    title:
                        title.trim(),

                    description:
                        description.trim(),

                    course:
                        course._id,

                    teacher:
                        req.session.userId,

                    dueDate:
                        due
                });

            await assignment.save();

            res.redirect(
                "/teacher/assignments"
            );

        } catch (err) {

            console.log(
                "Create assignment error:",
                err.message
            );

            res.send(
                "Unable to create assignment."
            );
        }
    }
);


/* Assignment Submissions */

router.get(
    "/teacher/assignments/:assignmentId/submissions",
    requireTeacher,
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
                await Assignment.findOne({

                    _id:
                        assignmentId,

                    teacher:
                        req.session.userId

                })
                    .populate("course")
                    .populate(
                        "submissions.student",
                        "name email"
                    );

            if (!assignment) {
                return res.send(
                    "Assignment not found."
                );
            }

            res.render(
                "assignment-submissions",
                {
                    assignment,

                    userName:
                        req.session.userName
                }
            );

        } catch (err) {

            console.log(
                "Assignment submissions error:",
                err.message
            );

            res.send(
                "Unable to load submissions."
            );
        }
    }
);


/* Course Students */

router.get(
    "/teacher/courses/:courseId/students",
    requireTeacher,
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
                await Course.findOne({

                    _id:
                        courseId,

                    teacher:
                        req.session.userId

                })
                    .populate(
                        "students",
                        "name email"
                    );

            if (!course) {
                return res.send(
                    "Course not found."
                );
            }

            res.render(
                "course-students",
                {
                    course,

                    students:
                        course.students,

                    userName:
                        req.session.userName
                }
            );

        } catch (err) {

            console.log(
                "Course students error:",
                err.message
            );

            res.send(
                "Unable to load students."
            );
        }
    }
);


/* Remove Student */

router.post(
    "/teacher/courses/:courseId/students/:studentId/remove",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                courseId,
                studentId
            } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    courseId
                ) ||
                !mongoose.Types.ObjectId.isValid(
                    studentId
                )
            ) {
                return res.send(
                    "Invalid ID."
                );
            }

            const course =
                await Course.findOne({

                    _id:
                        courseId,

                    teacher:
                        req.session.userId

                });

            if (!course) {
                return res.send(
                    "Course not found."
                );
            }

            course.students =
                course.students.filter(
                    id =>
                        id.toString() !==
                        studentId
                );

            await course.save();

            res.redirect(
                `/teacher/courses/${courseId}/students`
            );

        } catch (err) {

            console.log(
                "Remove student error:",
                err.message
            );

            res.send(
                "Unable to remove student."
            );
        }
    }
);


/* Delete Course */

router.post(
    "/teacher/courses/:courseId/delete",
    requireTeacher,
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
                await Course.findOne({

                    _id:
                        courseId,

                    teacher:
                        req.session.userId

                });

            if (!course) {
                return res.send(
                    "Course not found or unauthorized."
                );
            }

            await Assignment.deleteMany({
                course: courseId
            });

            await Material.deleteMany({
                course: courseId
            });

            await Quiz.deleteMany({
                course: courseId
            });

            await CourseRequest.deleteMany({
                course: courseId
            });

            await Course.deleteOne({
                _id: courseId
            });

            res.redirect(
                "/teacher/dashboard"
            );

        } catch (err) {

            console.log(
                "Delete course error:",
                err.message
            );

            res.send(
                "Unable to delete course."
            );
        }
    }
);


/* Teacher Materials */

router.get(
    "/teacher/materials",
    requireTeacher,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    teacher:
                        req.session.userId
                })
                    .sort({
                        courseName: 1
                    });

            const courseIds =
                courses.map(
                    course => course._id
                );

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

            res.render(
                "teacher-materials",
                {
                    materials,
                    courses,

                    userName:
                        req.session.userName
                }
            );

        } catch (err) {

            console.log(
                "Teacher materials error:",
                err.message
            );

            res.send(
                "Unable to load materials."
            );
        }
    }
);


/* Create Material Page */

router.get(
    "/teacher/materials/create",
    requireTeacher,
    async (req, res) => {

        try {

            const courses =
                await Course.find({
                    teacher:
                        req.session.userId
                })
                    .sort({
                        courseName: 1
                    });

            res.render(
                "create-material",
                {
                    courses
                }
            );

        } catch (err) {

            console.log(
                "Create material page error:",
                err.message
            );

            res.send(
                "Unable to load page."
            );
        }
    }
);


/* Create Material */

router.post(
    "/teacher/materials/create",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                title,
                description,
                materialLink,
                courseId
            } = req.body;

            if (
                !title ||
                !description ||
                !materialLink ||
                !courseId
            ) {
                return res.send(
                    "All fields are required!"
                );
            }

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
                await Course.findOne({

                    _id:
                        courseId,

                    teacher:
                        req.session.userId

                });

            if (!course) {
                return res.send(
                    "Course not found or unauthorized."
                );
            }

            if (
                isCourseExpired(course)
            ) {
                return res.send(
                    "This course has expired."
                );
            }

            const material =
                new Material({

                    title:
                        title.trim(),

                    description:
                        description.trim(),

                    materialLink:
                        materialLink.trim(),

                    course:
                        course._id,

                    teacher:
                        req.session.userId
                });

            await material.save();

            res.redirect(
                "/teacher/materials"
            );

        } catch (err) {

            console.log(
                "Create material error:",
                err.message
            );

            res.send(
                "Unable to create material."
            );
        }
    }
);


/* Edit Assignment Page */

router.get(
    "/teacher/assignments/:assignmentId/edit",
    requireTeacher,
    async (req, res) => {

        try {

            const assignment =
                await Assignment.findOne({

                    _id:
                        req.params.assignmentId,

                    teacher:
                        req.session.userId

                })
                    .populate("course");

            if (!assignment) {
                return res.send(
                    "Assignment not found."
                );
            }

            res.render(
                "edit-assignment",
                {
                    assignment
                }
            );

        } catch (err) {

            console.log(
                "Edit assignment error:",
                err.message
            );

            res.send(
                "Unable to edit assignment."
            );
        }
    }
);


/* Update Assignment */

router.post(
    "/teacher/assignments/:assignmentId/edit",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                title,
                description,
                dueDate
            } = req.body;

            const assignment =
                await Assignment.findOne({

                    _id:
                        req.params.assignmentId,

                    teacher:
                        req.session.userId

                });

            if (!assignment) {
                return res.send(
                    "Assignment not found."
                );
            }

            assignment.title =
                title.trim();

            assignment.description =
                description.trim();

            assignment.dueDate =
                dueDate;

            await assignment.save();

            res.redirect(
                `/course/${assignment.course}`
            );

        } catch (err) {

            console.log(
                "Update assignment error:",
                err.message
            );

            res.send(
                "Unable to update assignment."
            );
        }
    }
);


/* Edit Material Page */

router.get(
    "/teacher/materials/:materialId/edit",
    requireTeacher,
    async (req, res) => {

        try {

            const material =
                await Material.findOne({

                    _id:
                        req.params.materialId,

                    teacher:
                        req.session.userId

                })
                    .populate("course");

            if (!material) {
                return res.send(
                    "Material not found."
                );
            }

            res.render(
                "edit-material",
                {
                    material
                }
            );

        } catch (err) {

            console.log(
                "Edit material error:",
                err.message
            );

            res.send(
                "Unable to edit material."
            );
        }
    }
);


/* Update Material */

router.post(
    "/teacher/materials/:materialId/edit",
    requireTeacher,
    async (req, res) => {

        try {

            const {
                title,
                description,
                materialLink
            } = req.body;

            const material =
                await Material.findOne({

                    _id:
                        req.params.materialId,

                    teacher:
                        req.session.userId

                });

            if (!material) {
                return res.send(
                    "Material not found."
                );
            }

            material.title =
                title.trim();

            material.description =
                description.trim();

            material.materialLink =
                materialLink.trim();

            await material.save();

            res.redirect(
                `/course/${material.course}`
            );

        } catch (err) {

            console.log(
                "Update material error:",
                err.message
            );

            res.send(
                "Unable to update material."
            );
        }
    }
);


module.exports = router;