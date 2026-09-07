const mongoose = require("mongoose");

const courseRequestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },

    requestedAt: {
        type: Date,
        default: Date.now
    }
});

courseRequestSchema.index(
    { student: 1, course: 1 },
    { unique: true }
);

const CourseRequest = mongoose.model(
    "CourseRequest",
    courseRequestSchema
);

module.exports = CourseRequest;