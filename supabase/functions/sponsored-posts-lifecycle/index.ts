// Lifecycle job for sponsored posts: completes expired campaigns,
// activates scheduled ones, and reactivates daily-paused ones after UTC rollover.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const nowIso = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);

    // 1) Complete expired campaigns
    const { data: completed, error: e1 } = await supabase
      .from('sponsored_posts')
      .update({ status: 'completed' })
      .in('status', ['active', 'paused_daily'])
      .not('end_date', 'is', null)
      .lt('end_date', nowIso)
      .select('id');
    if (e1) throw e1;

    // 2) Activate scheduled campaigns whose start_date has passed
    const { data: activated, error: e2 } = await supabase
      .from('sponsored_posts')
      .update({ status: 'active' })
      .eq('status', 'scheduled')
      .not('start_date', 'is', null)
      .lte('start_date', nowIso)
      .or(`end_date.is.null,end_date.gt.${nowIso}`)
      .select('id');
    if (e2) throw e2;

    // 3) Reactivate paused_daily campaigns whose today's spend is below daily_budget
    //    (mostly relevant after UTC midnight rollover — new day = no row yet = spent < budget)
    const { data: dailyPaused, error: e3 } = await supabase
      .from('sponsored_posts')
      .select('id, daily_budget')
      .eq('status', 'paused_daily');
    if (e3) throw e3;

    const reactivated: string[] = [];
    for (const p of dailyPaused ?? []) {
      if (!p.daily_budget) {
        // No daily cap configured — safe to reactivate
        await supabase.from('sponsored_posts').update({ status: 'active' }).eq('id', p.id);
        reactivated.push(p.id);
        continue;
      }
      const { data: row } = await supabase
        .from('sponsored_daily_spend')
        .select('spent')
        .eq('sponsored_post_id', p.id)
        .eq('day', today)
        .maybeSingle();
      const todaySpent = Number(row?.spent ?? 0);
      if (todaySpent < Number(p.daily_budget)) {
        await supabase.from('sponsored_posts').update({ status: 'active' }).eq('id', p.id);
        reactivated.push(p.id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        completed: completed?.length ?? 0,
        activated: activated?.length ?? 0,
        reactivated: reactivated.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('lifecycle error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
