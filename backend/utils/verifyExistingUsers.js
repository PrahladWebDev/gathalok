// One-off migration script.
//
// Marks every user that existed BEFORE the email-verification feature was
// added as verified, so nobody who already had an account gets locked out
// of login. It only touches documents where the `isVerified` field is not
// stored in the database yet (i.e. accounts created before this update) —
// it will NOT touch anyone who registers after this feature ships, even if
// they haven't verified their email yet.
//
// Run it once, right after deploying this update:
//   cd backend && npm run verify-existing-users
//
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await User.updateMany(
      { isVerified: { $exists: false } },
      { $set: { isVerified: true } }
    );

    const matched = result.matchedCount ?? result.n;
    const modified = result.modifiedCount ?? result.nModified;
    console.log(`✅ Done. Matched ${matched} pre-existing user(s), verified ${modified} of them.`);

    if (matched === 0) {
      console.log('ℹ️  No pre-existing unverified accounts found — nothing to do (safe to re-run any time).');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
