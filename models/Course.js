const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: true
    },

    subject: {
        type: String,
        required: true
    },

    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    courseKey: {
        type: String,
        required: true,
        unique: true
    },

    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;