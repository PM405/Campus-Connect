const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    fileName: {
        type: String,
        required: true
    },

    filePath: {
        type: String,
        required: true
    },

    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },

    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    dueDate: {
        type: Date,
        required: true
    },

    submissions: [submissionSchema],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Assignment = mongoose.model("Assignment", assignmentSchema);

module.exports = Assignment;