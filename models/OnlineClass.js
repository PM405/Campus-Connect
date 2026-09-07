const mongoose = require("mongoose");

const onlineClassSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
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

    roomName: {
        type: String,
        required: true,
        unique: true
    },

    meetingLink: {
        type: String,
        required: true
    },

    scheduledAt: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: [
            "scheduled",
            "live",
            "ended"
        ],
        default: "scheduled"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const OnlineClass = mongoose.model(
    "OnlineClass",
    onlineClassSchema
);

module.exports = OnlineClass;