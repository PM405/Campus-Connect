const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },

    options: {
        type: [String],
        required: true
    },

    correctAnswer: {
        type: String,
        required: true
    },

    marks: {
        type: Number,
        required: true,
        default: 1
    }
});

const quizSchema = new mongoose.Schema({
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

    questions: [questionSchema],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Quiz = mongoose.model("Quiz", quizSchema);

module.exports = Quiz;