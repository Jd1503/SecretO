require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
 
const app = express();
 
app.use(express.static("public"));
app.set("view engine", "ejs");
 
app.use(bodyParser.urlencoded({
  extended: true
}));
 
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,
}));
 
app.use(passport.initialize());
app.use(passport.session());
 
// mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true });
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_CONNECT_URI, { useNewUrlParser: true });

 
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  username: String,
  googleId: {
    type: String,
    unique: true
  },
  secret: String
});
 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
 
const User = new mongoose.model("User", userSchema);
 
passport.use(User.createStrategy());
 
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username
    });
  });
});
 
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
 
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
 
// ///Facebook Strategy
// passport.use(new FacebookStrategy({
//   clientID: process.env.FACEBOOK_APP_ID,
//   clientSecret: process.env.FACEBOOK_APP_SECRET,
//   callbackURL: "http://localhost:3000/auth/facebook/secrets"
// },
//   function (accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));
 
// TODO
app.get("/", function (req, res) {
  res.render("home");
});
 
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
 
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }), function (req, res) {
    res.redirect("/secrets");
  }
);
 
///// Facebook Authentication
//app.get("/auth/facebook", passport.authenticate("facebook"));
// 
//app.get("/auth/facebook/secrets", passport.authenticate("facebook", { failureRedirect: "/login" }),
//  function (req, res) {
//    res.redirect("/secrets");
//  });
 
 
app.get("/login", function (req, res) {
  res.render("login");
});
 
app.get("/register", function (req, res) {
  res.render("register");
});
 
app.get("/secrets", function (req, res) {
  User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      } else {
        console.log(err);
      }
    }
  });
});
 
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    console.log(req.isAuthenticated()+" "+"hi")
    res.render("submit");
  } else {
    console.log(req.isAuthenticated())
    res.redirect("/login");
  }
});
 
app.post("/submit", function (req, res) {
  console.log(req.user.id);
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = req.body.secret;
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});
 
app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});
 
app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});
 
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
 
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});
 
app.listen(3000, function () {
  console.log("Server started on port 3000.");
});