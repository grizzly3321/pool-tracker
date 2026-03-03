// Supabase Edge Function: Send SMS notifications when a match is recorded
// Deploy: npx supabase functions deploy notify-match
// Secrets: npx supabase secrets set TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx TWILIO_PHONE_NUMBER=xxx APP_URL=xxx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { matchId } = await req.json();

    if (!matchId) {
      return new Response(JSON.stringify({ error: "matchId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch match details with player names
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(
        `
        id,
        winner_id,
        player1:player1_id(id, name),
        player2:player2_id(id, name)
      `
      )
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const winner =
      match.player1.id === match.winner_id ? match.player1 : match.player2;
    const loser =
      match.player1.id === match.winner_id ? match.player2 : match.player1;

    // Fetch winner's current record from leaderboard view
    const { data: stats } = await supabase
      .from("leaderboard")
      .select("total_wins, total_losses, win_pct")
      .eq("id", winner.id)
      .single();

    // Fetch all players with phone numbers
    const { data: players } = await supabase
      .from("players")
      .select("name, phone");

    const appUrl = Deno.env.get("APP_URL") || "";
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioSid || !twilioAuth || !twilioPhone) {
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const record = stats
      ? `${winner.name} is now ${stats.total_wins}-${stats.total_losses} (${stats.win_pct}%).`
      : "";

    const message = `🎱 ${winner.name} beat ${loser.name}! ${record}${appUrl ? ` View: ${appUrl}` : ""}`;

    // Send SMS to all players with phone numbers
    const results = [];
    for (const player of players || []) {
      if (!player.phone) continue;

      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization:
                "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
            },
            body: new URLSearchParams({
              To: player.phone,
              From: twilioPhone,
              Body: message,
            }),
          }
        );

        const result = await response.json();
        results.push({
          player: player.name,
          status: response.ok ? "sent" : "failed",
          sid: result.sid,
        });
      } catch (err) {
        results.push({
          player: player.name,
          status: "error",
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message, notifications: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
