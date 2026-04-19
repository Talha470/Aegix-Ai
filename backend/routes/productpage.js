const router = require("express").Router();
const productpage = require("../controllers/productpage");
const {
  isLoggedIn,
  validateProductSignup,
  validateProductLogin,
  validateDemoRequest,
  validateSelectPlan,
} = require("../middlewares");

router.post("/signup", validateProductSignup, productpage.signup);
router.post("/login", validateProductLogin, productpage.login);
router.get("/profile", isLoggedIn, productpage.profile);
router.post("/request-demo", validateDemoRequest, productpage.requestDemo);
router.post("/select-plan", isLoggedIn, validateSelectPlan, productpage.selectPlan);
router.delete("/delete-all-users", productpage.deleteAllUsers);
router.delete("/delete-all-demos", productpage.deleteAllDemoRequests);

module.exports = router;