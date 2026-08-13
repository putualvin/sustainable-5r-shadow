const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((request, response) => {
      handle(request, response);
    }).listen(port, () => {
      console.log(`Next.js is ready on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Next.js", error);
    process.exit(1);
  });
