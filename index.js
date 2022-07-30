const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config();

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String
},
{ versionKey: false }
);
   
const exerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  dateForSearching: Date,
  date: String
},
{ versionKey: false }
);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Users = mongoose.model("users", userSchema);
const Exercises = mongoose.model("exercises", exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const user = await new Users(req.body).save();

  return res.json(user)
});

app.get('/api/users', async (_req, res) => {
  const users = await Users.find({}).lean();

  return res.json(users)
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } =  req.params;
    const { date } =  req.body;
    
    if (date === undefined) {
      req.body.date = new Date();
      req.body.dateForSearching = new Date();
    } else {
      req.body.dateForSearching = new Date(req.body.date);
    }

    const { username } = await Users.findById(_id).lean();
    req.body.userId =  _id;
    const newExercise = await new Exercises(req.body).save();
    const { duration, description } = newExercise;

    const user = {
      _id,
      username,
      date: new Date(newExercise.date).toDateString(),
      duration,
      description
    };
    
    return res.json(user);
} catch (error) {
  console.log(error);
}
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } =  req.params;
    const { from, to, limit } =  req.query;

    let logs = [];

    const { username } = await Users.findById(_id).lean();

    if (Object.entries(req.query).length === 0) {
      logs = await Exercises.find({ userId: _id });
    }
    
    if (from !== undefined && limit !== undefined) {
      logs = await Exercises.find({ userId: _id, dateForSearching: { $gte: new Date(from), $lte: new Date(to) } }).limit(+limit);
    }

    if (from === undefined && limit !== undefined) {
      logs = await Exercises.find({ userId: _id }).limit(+limit);
    }

    if (from !== undefined && limit === undefined) {
      logs = await Exercises.find({ userId: _id, dateForSearching: { $gte: new Date(from), $lte: new Date(to) } });
    }
    
    if (logs.length > 0) {
      await Promise.all(
        logs.map(log => {
          log.date = new Date(log.date).toDateString()
        })
      );
    }
    
    return res.json({ _id, username, count: logs.length, log: logs });
} catch (error) {
  console.log(error);
}
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
