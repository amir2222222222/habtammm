const mongoose = require("mongoose");

// Game Schema
const GameSchema = new mongoose.Schema({
  gameStart: String,
  gameEnd: String,
  betBirr: Number,
  pickedCards: [String],
  onCalls: [String],
  winnerCards: [String],
  luckypassedCards: [String],
  dersh: Number,
  commission: Number,
  by: String,
  time: String,
  shopname: String,
  index: Number,
}, { _id: false });

// Helper: Today's date in YYYY-MM-DD
function getTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  shopname: { type: String, trim: true },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  credit: { type: Number, default: 0 },
  shouldAddCredit: { type: Boolean, default: false }, // <-- Explicit control
  balance: { type: Number, default: 0 },
  lastCreditTime: { type: String }, // or Date
  user_commission: {
    type: Number,
    min: 1,
    max: 100,
    default: 20,
  },
  owner_commission: {
    type: Number,
    min: 1,
    max: 100,
    default: 15,
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'shop'],
    default: 'user',
  },
  games: [GameSchema],
});

// Pre-save logic to apply credit only if flagged
UserSchema.pre("save", async function (next) {
  if (this.shouldAddCredit) {
    // Fetch existing user data to get the current balance
    const existingUser = await mongoose.models.User.findById(this._id);

    if (existingUser) {
      const newCredit = this.credit;

      // If the new credit is greater than zero, add it to the existing balance
      if (newCredit > 0) {
        this.balance = (existingUser.balance || 0) + newCredit;
      } else {
        // If the new credit is zero, retain the existing balance
        this.balance = existingUser.balance || 0;
      }

      this.lastCreditTime = getTodayDate();
      this.shouldAddCredit = false; // Reset after applying
    }
  }

  next();
});

module.exports = mongoose.model("User", UserSchema);
