import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception - server continues:", err.message, err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection - server continues:", reason);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
