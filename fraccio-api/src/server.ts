import Fastify from "fastify";
import { configureBaseRoutes } from "./api/routes/base.route.js";

const server = Fastify({
    logger: true
});

configureBaseRoutes(server);

server.listen({ port: 5000 }, (err, address) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
});