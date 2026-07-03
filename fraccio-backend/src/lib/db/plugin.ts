import { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import SupabaseClient from "./client.js";

async function supabasePlugin(fastify: FastifyInstance, opts: any) {
    const sbClient = SupabaseClient.getInstance();
    fastify.decorate("supabase", sbClient);
}

export default fp(supabasePlugin);