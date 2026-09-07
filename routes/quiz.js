const express = require("express");
const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const Course = require("../models/Course");

const router = express.Router();

function requireTeacher(req, res, next) {
    if (!req.session.userId || req.session.userRole !== "teacher") {
        return res.redirect("/login");
    }

    next();
}

function requireStudent(req, res, next) {
    if (!req.session.userId || req.session.userRole !== "student") {
        return res.redirect("/login");
    }

    next();
}

function isCourseExpired(course) {
    return new Date() > new Date(course.endDate);
}

router.get(
    "/teacher/quizzes/create",
    requireTeacher,
    async (req, res) => {
        try {
            const courses = await Course.find({
                teacher: req.session.userId
            }).sort({ courseName: 1 });

            res.render("create-quiz", {
                courses,
                userName: req.session.userName
            });
        } catch (err) {
            console.log("Create quiz page error:", err.message);
            res.send("Unable to load quiz creation page.");
        }
    }
);

router.post(
    "/teacher/quizzes/create",
    requireTeacher,
    async (req, res) => {
        try {
            const {
                title,
                description,
                courseId
            } = req.body;

            let {
                question,
                option1,
                option2,
                option3,
                option4,
                correctAnswer,
                marks
            } = req.body;

            if (!title || !description || !courseId) {
                return res.send("All quiz fields are required.");
            }

            if (!mongoose.Types.ObjectId.isValid(courseId)) {
                return res.send("Invalid course.");
            }

            const course = await Course.findOne({
                _id: courseId,
                teacher: req.session.userId
            });

            if (!course) {
                return res.send("You are not authorized for this course.");
            }

            if (isCourseExpired(course)) {
                return res.send("This course has expired.");
            }

            question = Array.isArray(question)
                ? question
                : [question];

            option1 = Array.isArray(option1)
                ? option1
                : [option1];

            option2 = Array.isArray(option2)
                ? option2
                : [option2];

            option3 = Array.isArray(option3)
                ? option3
                : [option3];

            option4 = Array.isArray(option4)
                ? option4
                : [option4];

            correctAnswer = Array.isArray(correctAnswer)
                ? correctAnswer
                : [correctAnswer];

            marks = Array.isArray(marks)
                ? marks
                : [marks];

            const questions = [];

            for (let i = 0; i < question.length; i++) {
                if (
                    !question[i] ||
                    !option1[i] ||
                    !option2[i] ||
                    !option3[i] ||
                    !option4[i] ||
                    !correctAnswer[i]
                ) {
                    return res.send(
                        `Question ${i + 1} is incomplete.`
                    );
                }

                if (
                    !["1", "2", "3", "4"].includes(
                        correctAnswer[i]
                    )
                ) {
                    return res.send(
                        `Invalid correct answer for question ${i + 1}.`
                    );
                }

                questions.push({
                    question: question[i].trim(),
                    options: [
                        option1[i].trim(),
                        option2[i].trim(),
                        option3[i].trim(),
                        option4[i].trim()
                    ],
                    correctAnswer: correctAnswer[i],
                    marks: Number(marks[i]) || 1
                });
            }

            if (questions.length === 0) {
                return res.send("Add at least one question.");
            }

            const quiz = new Quiz({
                title: title.trim(),
                description: description.trim(),
                course: course._id,
                teacher: req.session.userId,
                questions
            });

            await quiz.save();

            res.redirect("/teacher/quizzes");
        } catch (err) {
            console.log("Create quiz error:", err.message);
            res.send("Quiz creation failed.");
        }
    }
);

router.get(
    "/teacher/quizzes",
    requireTeacher,
    async (req, res) => {
        try {
            const quizzes = await Quiz.find({
                teacher: req.session.userId
            })
                .populate("course", "courseName subject")
                .sort({ createdAt: -1 });

            res.render("teacher-quizzes", {
                quizzes,
                userName: req.session.userName
            });
        } catch (err) {
            console.log("Teacher quizzes error:", err.message);
            res.send("Unable to load quizzes.");
        }
    }
);

router.get(
    "/student/quizzes/:quizId",
    requireStudent,
    async (req, res) => {
        try {
            const { quizId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(quizId)) {
                return res.send("Invalid quiz ID.");
            }

            const quiz = await Quiz.findById(quizId)
                .populate("course", "courseName subject startDate endDate students");

            if (!quiz) {
                return res.send("Quiz not found.");
            }

            const studentId = req.session.userId.toString();

            const isEnrolled = quiz.course.students.some(
                student => student.toString() === studentId
            );

            if (!isEnrolled) {
                return res.send(
                    "You are not enrolled in this course."
                );
            }

            if (isCourseExpired(quiz.course)) {
                return res.send("This course has expired.");
            }

            const totalMarks = quiz.questions.reduce(
                (total, question) => total + question.marks,
                0
            );

            res.render("quiz-attempt", {
                quiz,
                totalMarks,
                userName: req.session.userName
            });
        } catch (err) {
            console.log("Quiz attempt error:", err.message);
            res.send("Unable to load quiz.");
        }
    }
);

router.post(
    "/student/quizzes/:quizId/submit",
    requireStudent,
    async (req, res) => {
        try {
            const { quizId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(quizId)) {
                return res.send("Invalid quiz ID.");
            }

            const quiz = await Quiz.findById(quizId)
                .populate("course", "courseName students");

            if (!quiz) {
                return res.send("Quiz not found.");
            }

            const studentId = req.session.userId.toString();

            const isEnrolled = quiz.course.students.some(
                student => student.toString() === studentId
            );

            if (!isEnrolled) {
                return res.send(
                    "You are not enrolled in this course."
                );
            }

            let score = 0;
            let totalMarks = 0;

            quiz.questions.forEach((question, index) => {
                totalMarks += question.marks;

                const answer =
                    req.body[`question_${index}`];

                if (answer === question.correctAnswer) {
                    score += question.marks;
                }
            });

            const percentage =
                totalMarks > 0
                    ? Math.round(
                          (score / totalMarks) * 100
                      )
                    : 0;

            res.render("quiz-result", {
                quiz,
                course: quiz.course,
                score,
                totalMarks,
                percentage,
                userName: req.session.userName
            });
        } catch (err) {
            console.log("Quiz submit error:", err.message);
            res.send("Unable to submit quiz.");
        }
    }
);

module.exports = router;