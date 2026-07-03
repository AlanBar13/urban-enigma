import { createClient, type SupabaseClient } from "@supabase/supabase-js"

class SupaClient {
    private static instance: SupaClient;
    private supabase: SupabaseClient;

    private constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SECRET_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Supabase URL or Key is not defined in environment variables");
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    public static getInstance(): SupaClient {
        if (!SupaClient.instance) {
            SupaClient.instance = new SupaClient();
        }
        return SupaClient.instance;
    }

    public getSupabase(): SupabaseClient {
        return this.supabase;
    }
}

export default SupaClient;