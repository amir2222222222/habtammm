const crypto = require("crypto");
const cookie = require("cookie");
const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

function shuffleArrayCrypto(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getCookie(cookies, name, defaultValue, parseJson = false) {
    const cookieVal = cookies[name];
    if (!cookieVal) return defaultValue;
    try {
        return parseJson ? JSON.parse(cookieVal) : cookieVal;
    } catch (error) {
        console.error(`Failed to parse cookie "${name}":`, error);
        return defaultValue;
    }
}

function getCustomTimeString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function initSocketListeners(io) {
    io.on("connection", async (socket) => {
        const rawCookies = cookie.parse(socket.handshake.headers.cookie || "");

        const token = rawCookies.token;
        const balanceToken = rawCookies.RequiredBalanceToken;

        if (!token || !balanceToken) {
            return socket.emit("errorMsg", "🚫 Missing authentication token.");
        }

        let userId, requiredBalance = 0;
        try {
            const verifiedToken = verifyToken(token);
            const verifiedBalanceToken = verifyToken(balanceToken);

            userId = verifiedToken.id;
            requiredBalance = parseFloat(verifiedBalanceToken.requiredBalance) || 0;
        } catch (error) {
            console.error("Token verification error:", error);
            return socket.emit("errorMsg", "🚫 Invalid or expired token.");
        }

        const selectedCarts = getCookie(rawCookies, "SelectedCarts", [], true);
        const winningAmount = getCookie(rawCookies, "WinningAmount", 0, false);
        const betBirr = parseFloat(getCookie(rawCookies, "BetBirr", 0, false));

        try {
            const user = await User.findById(userId);
            if (!user) {
                return socket.emit("errorMsg", "🚫 User not found.");
            }

            let balanceDeducted = false;
            let gameStarted = false;
            let gameIndex = null;

            socket.on("sendNumbers", async () => {
                if (gameStarted) {
                    const numbers = shuffleArrayCrypto([...Array(75).keys()].map(n => n + 1));
                    socket.emit("displayNumbers", numbers);
                    console.log("🎲 Numbers sent to client. Game already started.");
                    return;
                }

                if (!balanceDeducted) {
                    if (user.balance < requiredBalance) {
                        return socket.emit("errorMsg", "💸 Insufficient balance.");
                    }

                    const time = getCustomTimeString();
                    user.balance -= requiredBalance;
                    const newGame = {
                        gameStart: time,
                        gameEnd: time, // Will be updated later
                        betBirr: betBirr,
                        pickedCards: selectedCarts,
                        onCalls: [],
                        winnerCards: [],
                        luckypassedCards: [],
                        dersh: winningAmount,
                        commission: requiredBalance || 0,
                        by: user.username,
                        shopname: user.shopname || user.username,
                        time,
                        index: user.games.length,
                    };

                    user.games.push(newGame);

                    await user.save(); // ✅ Only one save here
                    balanceDeducted = true;
                    gameStarted = true;
                    gameIndex = newGame.index;

                    console.log("✅ Balance deducted, game started, and game saved.", newGame);

                    const numbers = shuffleArrayCrypto([...Array(75).keys()].map(n => n + 1));
                    socket.emit("displayNumbers", numbers);
                    console.log("🎲 Numbers sent to client. New game started.");
                } else {
                    console.log("⛔ The game has ended.");
                }
            });

            socket.on("chake", async ({ cart, winner, luckyPassed }) => {
                if (!cart || typeof cart !== "string") {
                    return socket.emit("errorMsg", "⚠️ Invalid cart format.");
                }

                if (gameIndex === null || !user.games[gameIndex]) {
                    return socket.emit("errorMsg", "⚠️ Game not initialized.");
                }

                const currentGame = user.games[gameIndex];

                if (!currentGame.onCalls) currentGame.onCalls = [];
                if (!currentGame.onCalls.includes(cart)) {
                    currentGame.onCalls.push(cart);
                }

                if (winner && !currentGame.winnerCards.includes(cart)) {
                    currentGame.winnerCards.push(cart);
                }

                if (luckyPassed && !currentGame.luckypassedCards.includes(cart)) {
                    currentGame.luckypassedCards.push(cart);
                }

                currentGame.gameEnd = getCustomTimeString();

                // ✅ Safe saving to prevent ParallelSaveError
                if (!user.$__.saving) {
                    await user.save();
                } else {
                    console.log("⏳ Waiting for previous save to finish...");
                    const wait = () => new Promise(res => setTimeout(res, 100));
                    while (user.$__.saving) {
                        await wait();
                    }
                    await user.save();
                }

                console.log(`📝 Cart ${cart} ${winner ? "marked as winner" : "checked"} and saved.`);
            });

        } catch (error) {
            console.error("Database error:", error);
            socket.emit("errorMsg", "⚠️ An unexpected error occurred.");
        }
    });
}

module.exports = initSocketListeners;
