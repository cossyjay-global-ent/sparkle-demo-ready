/**
 * PAYSTACK WEBHOOK HANDLER — Phase 3B
 * Verifies Paystack webhook signatures and upgrades subscriptions.
 * 
 * Accepted events: charge.success
 * All other events are acknowledged but ignored.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Read raw body for signature verification
    const rawBody = await req.text();

    // 2. Verify Paystack signature
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      console.error("[Webhook] PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      console.warn("[Webhook] Missing x-paystack-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedSignature = createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("[Webhook] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse event payload
    let event: { event: string; data: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Webhook] Received event:", event.event);

    // 4. Only process charge.success
    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Extract reference from payload
    const reference = event.data?.reference as string | undefined;
    if (!reference) {
      console.warn("[Webhook] No reference in payload");
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Initialize Supabase with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 7. Look up payment record by reference
    const { data: paymentRecord, error: lookupError } = await supabase
      .from("payment_records")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (lookupError) {
      console.error("[Webhook] Lookup error:", lookupError);
      return new Response(JSON.stringify({ error: "Lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentRecord) {
      console.warn("[Webhook] No payment record for reference:", reference);
      return new Response(JSON.stringify({ message: "No matching record" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. IDEMPOTENCY: Skip if already processed
    if (paymentRecord.status === "success") {
      console.log("[Webhook] Already processed, skipping:", reference);
      return new Response(JSON.stringify({ message: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9. Update payment record to success
    const { error: updateError } = await supabase
      .from("payment_records")
      .update({
        status: "success",
        paystack_reference: (event.data?.id as string) || reference,
        metadata: {
          ...(paymentRecord.metadata as Record<string, unknown> || {}),
          verified_at: new Date().toISOString(),
          webhook_event: event.event,
          paystack_transaction_id: event.data?.id,
        },
      })
      .eq("reference", reference);

    if (updateError) {
      console.error("[Webhook] Failed to update payment record:", updateError);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Webhook] Payment record updated:", reference);

    // 10. Upgrade subscription
    const plan = paymentRecord.plan; // 'pro' or 'business'
    const userId = paymentRecord.user_id;

    // Map plan names (handle 'admin' alias)
    const subscriptionPlan = plan === "admin" ? "business" : plan;

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSub) {
      // IDEMPOTENCY: Don't downgrade or re-apply same plan
      const planHierarchy: Record<string, number> = { free: 0, pro: 1, business: 2 };
      const currentLevel = planHierarchy[existingSub.plan] ?? 0;
      const newLevel = planHierarchy[subscriptionPlan] ?? 0;

      if (newLevel > currentLevel) {
        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            plan: subscriptionPlan,
            status: "active",
            paystack_subscription_id: (event.data?.id as string) || null,
            paystack_customer_id: ((event.data?.customer as Record<string, unknown>)?.customer_code as string) || null,
          })
          .eq("id", existingSub.id);

        if (subError) {
          console.error("[Webhook] Subscription upgrade failed:", subError);
        } else {
          console.log("[Webhook] Subscription upgraded to", subscriptionPlan, "for user", userId);
        }
      } else {
        console.log("[Webhook] Subscription already at or above", subscriptionPlan);
      }
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan: subscriptionPlan,
          status: "active",
          paystack_subscription_id: (event.data?.id as string) || null,
          paystack_customer_id: ((event.data?.customer as Record<string, unknown>)?.customer_code as string) || null,
        });

      if (insertError) {
        console.error("[Webhook] Subscription creation failed:", insertError);
      } else {
        console.log("[Webhook] Subscription created:", subscriptionPlan, "for user", userId);
      }
    }

    return new Response(JSON.stringify({ message: "Webhook processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Webhook] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
