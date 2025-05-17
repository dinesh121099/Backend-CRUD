require('dotenv').config();
import { createServer, IncomingMessage, ServerResponse } from "http";
import { MongoClient} from "mongodb";
import { URL } from "url";
import handler from "./utils/handlers";

const uri: any = process.env.MONGO_URL;
const client = new MongoClient(uri);
const handlers = handler();

// Setting up the server
client
.connect()
.then(() => {
  console.log("MongoDB connected");

  const server = createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Routing to particular handlers
    if (method === "GET" && pathname === "/load") return handlers.load(req, res);
    if (method === "DELETE" && pathname === "/users") return handlers.deleteAllUsers(req, res);
    if (method === "PUT" && pathname === "/users") return handlers.putUser(req, res);

    if (pathname.startsWith("/users/")) {
      const id = parseInt(pathname.split("/")[2]);
      if (isNaN(id)) {
        res.writeHead(400);
        return res.end("Invalid userId");
      }

      if (method === "GET") return handlers.getUser(req, res, id);
      if (method === "DELETE") return handlers.deleteUser(req, res, id);
    }

    // 404 fallback for Non available APIs in server
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Requested URL Not Found");
  });

  const port: any = process.env.PORT;
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
