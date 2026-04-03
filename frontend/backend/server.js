const path = require("path");

// Make backend/.env resolve correctly even if this launcher is run
// from the accidental frontend/backend folder.
process.chdir(path.resolve(__dirname, "..", "..", "backend"));

require(path.join(process.cwd(), "server.js"));
