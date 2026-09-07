const express = require("express");
const mongoose = require("mongoose");
const Notice = require("../models/Notice");
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

router.get("/teacher/notices", requireTeacher, async (req, res) => {
    try {
        const notices = await Notice.find({
            teacher: req.session.userId
        })
            .populate("course", "courseName subject")
            .sort({ createdAt: -1 });

        res.render("teacher-notices", {
            notices,
            userName: req.session.userName
        });
    } catch (err) {
        console.log("Teacher notices error:", err.message);
        res.send("Unable to load notices.");
    }
});

router.get("/teacher/notices/create", requireTeacher, async (req, res) => {
    try {
        const courses = await Course.find({
            teacher: req.session.userId
        }).sort({ courseName: 1 });

        res.render("create-notice", {
            courses,
            userName: req.session.userName
        });
    } catch (err) {
        console.log("Create notice page error:", err.message);
        res.send("Unable to load notice creation page.");
    }
});

router.post("/teacher/notices/create", requireTeacher, async (req, res) => {
    try {
        const { title, description, courseId } = req.body;

        if (!title || !description || !courseId) {
            return res.send("All notice fields are required.");
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

        const notice = new Notice({
            title: title.trim(),
            description: description.trim(),
            course: course._id,
            teacher: req.session.userId
        });

        await notice.save();

        res.redirect("/teacher/notices");
    } catch (err) {
        console.log("Create notice error:", err.message);
        res.send("Notice creation failed.");
    }
});

router.post("/teacher/notices/:noticeId/delete", requireTeacher, async (req, res) => {
    try {
        const { noticeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(noticeId)) {
            return res.send("Invalid notice ID.");
        }

        const notice = await Notice.findOne({
            _id: noticeId,
            teacher: req.session.userId
        });

        if (!notice) {
            return res.send("Notice not found.");
        }

        await Notice.findByIdAndDelete(noticeId);

        res.redirect("/teacher/notices");
    } catch (err) {
        console.log("Delete notice error:", err.message);
        res.send("Unable to delete notice.");
    }
});

router.get("/student/notices", requireStudent, async (req, res) => {
    try {
        const studentId = req.session.userId;

        const courses = await Course.find({
            students: studentId
        }).select("_id");

        const courseIds = courses.map(course => course._id);

        const notices = await Notice.find({
            course: { $in: courseIds }
        })
            .populate("course", "courseName subject")
            .populate("teacher", "name")
            .sort({ createdAt: -1 });

        res.render("student-notices", {
            notices,
            userName: req.session.userName
        });
    } catch (err) {
        console.log("Student notices error:", err.message);
        res.send("Unable to load notices.");
    }
});

module.exports = router;