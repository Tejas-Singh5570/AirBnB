const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const expressError = require("./utils/expressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const {isLoggedIn, isOwner, isReviewAuthor } = require("./middleware.js");

require("dotenv").config();

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;
const PORT = process.env.PORT || 8080;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err); 
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const sessionOption = {
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },

};



app.use(session(sessionOption));
app.use(flash());

// initializing the passport
app.use(passport.initialize());
app.use(passport.session());

// creating middleware for flash
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  
  res.locals.currUser = req.user;
  res.locals.name = "tejas";
  res.locals.val = 4*3;

  // console.log(req.user);
  // console.log(res.locals.name);
  next();
})




// authenticate the user model
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const validateReview = (req, res, next) => {
  let {error} = reviewSchema.validate(req.body);
  
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new expressError(400, errMsg);
  }
  else{
    next();
  }
}

// app.get("/demouser", async(req, res) => {
//   let fakeUser = new User({
//     email: "baklolstudent@gamil.com",
//     username: "kabil",
    
//   });
//   let registerUser = await User.register(fakeUser, "passward_7");
//   res.send(registerUser); 
// })
//----------------------------------------------listing route-----------
//Index Route
app.get("/listing", async (req, res) => {
  const allListing = await Listing.find({});
  res.render("listing/index.ejs", { allListing });
});

//New Route
app.get("/listing/new",isLoggedIn, (req, res) => {
  
  res.render("listing/new.ejs");
  
});

//Show Route
app.get("/listing/:id", wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
  .populate({
   path: "reviews",
   populate: {
   path: "author"
   },
  })
 
  .populate("owner");
  res.render("listing/show.ejs", { listing });

  if(!listing ) {
    req.flash("error", "listing you are request for is does't exist!");
  };

  // console.log(res.locals.currclint);
  // console.log(res.locals.name);
  // console.log(req.user);

  
  
}));

//Create Route
app.post("/listing", wrapAsync(async (req, res, next) => {
  
  // if(!req.body.listing) {
  //   throw new expressError(400, "Send valid data for listing");
  // }

  let result = req.body;
 
  if(result.error) {
    throw new expressError(400, result.error);
  }
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  await newListing.save();

  req.flash("success", "New Listing Created");
  res.redirect("/listing");


 
})
);

//Edit Route
app.get("/listing/:id/edit",isLoggedIn, isOwner, wrapAsync(async (req, res) => {

  

  let { id } = req.params;
  const listing = await Listing.findById(id);
  
  res.render("listing/edit.ejs", { listing });
}));

//Update Route
app.put("/listing/:id",isOwner, wrapAsync( async (req, res) => {

  if(!req.body.listing) {
    throw new expressError(400, "Send valid data for listing");
  }
  
  let { id } = req.params;


  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  req.flash("success", "Updated");
  res.redirect(`/listing/${id}`);
}));

//Delete Route
app.delete("/listing/:id",isLoggedIn, isOwner, wrapAsync(async (req, res) => {

  

  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);

  req.flash("success", "Deleted listing");
  res.redirect("/listing");
}));

//back route
app.post("/listing/:id", wrapAsync(async(req, res) => {
  res.redirect("/listing");
}));
//-----------------------------------------review section---------
// route for storing reviews in db
// post request
app.post("/listing/:id/review",isLoggedIn, validateReview, wrapAsync(async(req, res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);

  newReview.author = req.user._id;
  listing.reviews.push(newReview);
  await listing.save();
  await newReview.save();

  req.flash("success", "review is added succesfully")
 res.redirect(`/listing/${listing._id}`);

 console.log(newReview);
}));
 

// delete review route
app.delete("/listing/:id/review/:reviewId",isLoggedIn, isReviewAuthor ,wrapAsync(async(req, res) => {

  
  let {id, reviewId} = req.params; 
  await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "review deleted");
  res.redirect(`/listing/${id}`);
})) 

//------------------------user route-------------------------
app.get("/signup" , (req, res) => {
  res.render("users/signup.ejs");
});

app.post("/signup", wrapAsync(async(req, res) => {
  try{
    let {username, email, password} = req.body;
    const newUser = new User({ email, username});
  
    const registeredUser = await User.register(newUser, password);
    console.log(registeredUser);

    res.redirect("/login");

  }catch(e) {
    req.flash("error" , e.message);
    res.redirect("/signup");
  }
}));

app.get("/login" , (req, res) => {
  res.render("users/login.ejs");
});

app.post("/login", passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), (req, res) => {
  req.flash( "success", `Welcome ${req.user.username} to wanderlust`);
  res.redirect("/listing");
});

app.get("/admin" , (req, res) => {
  res.render("users/admin.ejs");
});

app.post("/admin",passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), (req, res) => {
  req.flash( "success", `Welcome ${req.user.username} to wanderlust`);
  res.redirect("/listing");
} )


// logout route
app.get("/logout" , (req, res, next) => {
  req.logout((err) => {
    if(err) {
      return next(err);
    }

    req.flash("success", "logged out");
    res.redirect("/listing");
  })
});





//---------------------------------------------------------------------
//for non existing route
app.all("*", (req, res, next) => {
  next(new expressError(404, "Page Not Found!"));
});

// middleware for error handler
app.use((err,req, res, next) => {
  let {statusCode = 500, message = "something went worng"} = err;
  // res.status(statusCode).send(message);
  
  res.render("error.ejs", {message});
});


app.listen(PORT, () => {
  console.log("server is listening to port 8080");
});