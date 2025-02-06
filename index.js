const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.status(500).json({ error: "Error creating user" });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "_id username");
  res.json(users);
});

// Add an exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const exercise = new Exercise({
      userId: _id,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Error adding exercise" });
  }
});

// Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });
    let filter = { userId: _id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    let exercises = Exercise.find(filter).select("description duration date");
    if (limit) exercises = exercises.limit(Number(limit));
    exercises = await exercises;
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map((e) => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching logs" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
