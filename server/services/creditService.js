const User = require("../models/User");

const DAILY_CREDITS = 1000;

/**
 * Checks if the user's credits need their daily refill (1,000 free credits every day).
 * Refills automatically if the date (day/month/year) has changed since lastCreditRefill.
 */
async function getAndRefillCredits(userIdOrUser) {
  let user = userIdOrUser;
  if (!user || !user.save) {
    user = await User.findById(userIdOrUser);
  }

  if (!user) return null;

  const now = new Date();
  const lastRefill = user.lastCreditRefill ? new Date(user.lastCreditRefill) : new Date(0);

  // Compare calendar day in UTC
  const isNewDay =
    now.getUTCFullYear() !== lastRefill.getUTCFullYear() ||
    now.getUTCMonth() !== lastRefill.getUTCMonth() ||
    now.getUTCDate() !== lastRefill.getUTCDate();

  let modified = false;

  if (isNewDay) {
    // Only refill if user has spent below the daily allowance
    // Do not decrease credits if an admin granted them extra credits
    if ((user.credits || 0) < DAILY_CREDITS) {
      user.credits = DAILY_CREDITS;
      modified = true;
    }
    user.lastCreditRefill = now;
    modified = true;
  } else if (user.credits === undefined || user.credits === null) {
    user.credits = DAILY_CREDITS;
    user.lastCreditRefill = now;
    user.maxDailyCredits = Math.max(DAILY_CREDITS, user.maxDailyCredits || 0);
    modified = true;
  }

  if (modified) {
    await user.save();
  }

  return user;
}

/**
 * Deducts specified amount of credits from user.
 * Automatically checks and refills daily credits first.
 * Throws 402 Error if credits are insufficient.
 */
async function deductUserCredits(userId, amount = 1, actionName = "operation") {
  const user = await getAndRefillCredits(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.credits < amount) {
    const error = new Error(
      `Insufficient credits! You need ${amount} credit(s), but only have ${user.credits} remaining. Your credits will automatically refill to ${DAILY_CREDITS} tomorrow.`
    );
    error.statusCode = 402;
    error.insufficientCredits = true;
    error.remainingCredits = user.credits;
    throw error;
  }

  user.credits = Math.max(0, user.credits - amount);
  await user.save();

  return {
    success: true,
    deducted: amount,
    remainingCredits: user.credits,
    action: actionName
  };
}

module.exports = {
  DAILY_CREDITS,
  getAndRefillCredits,
  deductUserCredits
};
