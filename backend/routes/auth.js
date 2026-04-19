const router = require("express").Router();
const auth = require("../controllers/auth");
const { isLoggedIn, validateSignup, validateLogin } = require("../middlewares");

router.post("/signup", validateSignup, auth.signup);
router.post("/login", validateLogin, auth.login);
router.get("/profile", isLoggedIn, auth.profile);

module.exports = router;