import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("VITE_PAYSTACK_PUBLIC_KEY");

    if (!key) {
      console.error("[get-paystack-key] VITE_PAYSTACK_PUBLIC_KEY not set");
      return new Response(
        JSON.stringify({ error: "Paystack key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Safety: never expose secret keys — only return keys starting with "pk_"
    if (!key.startsWith("pk_")) {
      console.error("[get-paystack-key] Key does not appear to be a public key");
      return new Response(
        JSON.stringify({ error: "Invalid key configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-paystack-key] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
