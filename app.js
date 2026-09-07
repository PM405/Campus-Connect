const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);


const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const ejsMate = require("ejs-mate");


dotenv.config();


const app = express();

const PORT =
    process.env.PORT || 8080;


app.engine(
    "ejs",
    ejsMate
);


app.set(
    "view engine",
    "ejs"
);


app.set(
    "views",
    path.join(
        __dirname,
        "views"
    )
);


app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(
    express.json()
);


app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "campusconnect_secret_2026",

        resave: false,

        saveUninitialized: false,

        cookie: {
            maxAge:
                1000 *
                60 *
                60 *
                24
        }
    })
);


// Routes

const indexRoutes =
    require("./routes/index");


const authRoutes =
    require("./routes/auth");


const studentRoutes =
    require("./routes/student");


const teacherRoutes =
    require("./routes/teacher");


const quizRoutes =
    require("./routes/quiz");


const courseRoutes =
    require("./routes/course");


const noticeRoutes =
    require("./routes/notice");


const discussionRoutes =
    require("./routes/discussion");


const messageRoutes =
    require("./routes/message");

const onlineClassRoutes =
    require("./routes/onlineClass");


// Route Mounting

app.use(
    "/",
    indexRoutes
);


app.use(
    "/",
    authRoutes
);


app.use(
    "/",
    studentRoutes
);


app.use(
    "/",
    teacherRoutes
);


app.use(
    "/",
    quizRoutes
);


app.use(
    "/",
    courseRoutes
);


app.use(
    "/",
    noticeRoutes
);


app.use(
    "/",
    discussionRoutes
);


app.use(
    "/",
    messageRoutes
);
app.use("/",
     onlineClassRoutes);

// MongoDB Connection

mongoose
    .connect(
        process.env.MONGO_URI
    )
    .then(() => {

        console.log(
            "MongoDB connected successfully!"
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    `CampusConnect running on http://localhost:${PORT}`
                );

            }
        );

    })
    .catch((err) => {

        console.log(
            "MongoDB connection error:",
            err.message
        );

    });