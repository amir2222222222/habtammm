const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { user } = require("../middleware/authmiddleware");
const { generateToken } = require("../utils/jwt");
require("dotenv").config();

// Helper to get cookie or default safely (no signature verification)
function getCookieOrDefault(req, name, defaultValue, parseJson = false) {
  try {
    const val = req.cookies[name];
    if (!val) return defaultValue;
    return parseJson ? JSON.parse(val) : val;
  } catch {
    return defaultValue;
  }
}

// GET: Render home and set default cookies
router.get("/home", user, async (req, res) => {
  try {
    const foundUser = await User.findById(req.user.id).lean();
    if (!foundUser) {
      return res.status(404).render("home", { error: "User not found." });
    }

    const defaultVoiceType = "Recommended_Black_Male_Voice";
    const defaultGameSpeed = "2";
    const defaultPatterns = ["h", "v", "d", "sc", "lc"];

    const voicetype = getCookieOrDefault(req, "VoiceType", defaultVoiceType);
    const gamespeed = getCookieOrDefault(req, "GameSpeed", defaultGameSpeed);
    const patterns = getCookieOrDefault(req, "Patterns", defaultPatterns, true);

    res.cookie("VoiceType", voicetype, { sameSite: "lax" });
    res.cookie("GameSpeed", gamespeed, { sameSite: "lax" });
    res.cookie("Patterns", JSON.stringify(patterns), { sameSite: "lax" });

    res.render("home");
  } catch (error) {
    console.error("❌ Error in GET /home:", error);
    res.status(500).render("home", { error: "Internal server error." });
  }
});

// POST: Accept bet and set game-related cookies
router.post("/home", user, async (req, res) => {
  try {
    const { betbirr, selectedcarts, linechaker } = req.body;

    if (!betbirr || isNaN(betbirr) || parseFloat(betbirr) < 10) {
      return res.status(400).json({ message: "betbir must be a number and at least 10." });
    }

    if (!Array.isArray(selectedcarts) || selectedcarts.length === 0) {
      return res.status(400).json({ message: "selectedcarts must be a non-empty array." });
    }

    const lineChakerNum = parseInt(linechaker, 10);
    if (isNaN(lineChakerNum) || lineChakerNum < 1 || lineChakerNum > 5) {
      return res.status(400).json({ message: "linechaker must be a number between 1 and 5." });
    }

    const foundUser = await User.findById(req.user.id).lean();
    if (!foundUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const betBirrNum = parseFloat(betbirr);
    const userComission = parseFloat(foundUser.user_commission) || 0;
    const userBalance = parseFloat(foundUser.balance) || 0;

    const totalBet = betBirrNum * selectedcarts.length;
    const winningAmount = totalBet - (totalBet * (userComission / 100));
    const requiredBalance = totalBet - winningAmount;

    if (userBalance < requiredBalance) {
      return res.status(400).json({ message: "Insufficient balance to place the bet." });
    }

    // Unsigned cookies
    res.cookie("BetBirr", betBirrNum, { sameSite: "lax" });
    res.cookie("SelectedCarts", JSON.stringify(selectedcarts), { sameSite: "lax" });
    res.cookie("LineChaker", lineChakerNum, { sameSite: "lax" });
    res.cookie("WinningAmount", winningAmount.toFixed(2), { sameSite: "lax" });
    res.cookie("TotalBet", totalBet.toFixed(2), { sameSite: "lax" });

    // JWT-signed token only for RequiredBalance
    const requiredBalanceToken = generateToken({ requiredBalance: requiredBalance.toFixed(2) });
    res.cookie("RequiredBalanceToken", requiredBalanceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });

    // JWT for game opening access
    const openToken = generateToken({ open: "true" });
    res.cookie("OpenToken", openToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10000,
    });

    res.redirect("/bingo_play");
  } catch (error) {
    console.error("Error in /home POST:", error);
    res.status(500).json({ message: "Server error while submitting bet." });
  }
});

module.exports = router;
