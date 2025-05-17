require('dotenv').config();
import fetchJSON from "./fetchfunc";
import { IncomingMessage, ServerResponse } from "http";
import { MongoClient} from "mongodb";

export default function handler() {
    
    const dbName = "rest_api_app";
    const uri: any = process.env.MONGO_URL;
    const client = new MongoClient(uri);

    interface User {
        id: number;
        name: string;
        username: string;
        email: string;
    }

    interface Post {
        id: number;
        userId: number;
        title: string;
        body: string;
    }

    interface Comment {
        id: number;
        postId: number;
        name: string;
        email: string;
        body: string;
    }

    return {
        //Route handlers for the 
        async load(_: IncomingMessage, res: ServerResponse) {
            try {
                const [users, posts, comments] = await Promise.all([
                    fetchJSON("https://jsonplaceholder.typicode.com/users"),
                    fetchJSON("https://jsonplaceholder.typicode.com/posts"),
                    fetchJSON("https://jsonplaceholder.typicode.com/comments"),
                ]);

                const selectedUsers = users.slice(0, 10);
                const selectedPosts = posts.filter((p: Post) =>
                    selectedUsers.some((u: User) => u.id === p.userId)
                );
                const selectedComments = comments.filter((c: Comment) =>
                    selectedPosts.some((p: Post) => p.id === c.postId)
                );

                const db = client.db(dbName);
                await db.collection("users").deleteMany({});
                await db.collection("posts").deleteMany({});
                await db.collection("comments").deleteMany({});

                await db.collection("users").insertMany(selectedUsers);
                await db.collection("posts").insertMany(selectedPosts);
                await db.collection("comments").insertMany(selectedComments);

                res.writeHead(200);
                res.end();
            } 
            catch (err) {
                res.writeHead(500);
                res.end("Failed to load data");
            }
        },

        async getUser(_: IncomingMessage, res: ServerResponse, userId: number) {
            const db = client.db(dbName);
            const user = await db.collection("users").findOne({ id: userId });
            if (!user) {
                res.writeHead(404, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "User not found" }));
            }

            const posts = await db.collection("posts").find({ userId }).toArray();
            const comments = await db.collection("comments").find({
                postId: { $in: posts.map(p => p.id) }
            }).toArray();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ user, posts, comments }));
        },

        async deleteAllUsers(_: IncomingMessage, res: ServerResponse) {
            const db = client.db(dbName);
            await db.collection("users").deleteMany({});
            res.writeHead(204);
            res.end();
        },

        async deleteUser(_: IncomingMessage, res: ServerResponse, userId: number) {
            const db = client.db(dbName);
            const result = await db.collection("users").deleteOne({ id: userId });
            if (result.deletedCount === 0) {
                res.writeHead(404);
                res.end("User not found");
            } else {
                res.writeHead(204);
                res.end();
            }
        },

        async putUser(req: IncomingMessage, res: ServerResponse) {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", async () => {
                const db = client.db(dbName);
                const user: User = JSON.parse(body);

                const exists = await db.collection("users").findOne({ id: user.id });
                if (exists) {
                    res.writeHead(409, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "User already exists" }));
                }

                await db.collection("users").insertOne(user);
                res.writeHead(201, {
                    "Content-Type": "application/json",
                    "Location": `/users/${user.id}`
                });
                res.end(JSON.stringify({ success: true }));
            });
        }
    };
}