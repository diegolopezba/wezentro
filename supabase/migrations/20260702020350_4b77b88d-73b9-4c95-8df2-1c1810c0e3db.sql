
DO $$
DECLARE
  jid bigint;
BEGIN
  -- Reschedule trending refresh to every 30 minutes.
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname = 'refresh-trending-scores-cache' LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
  PERFORM cron.schedule(
    'refresh-trending-scores-cache',
    '*/30 * * * *',
    $c$ SELECT public.refresh_trending_scores_cache(); $c$
  );

  -- Slow email queue dispatcher from 5s to 60s.
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue' LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
  PERFORM cron.schedule(
    'process-email-queue',
    '* * * * *',
    $c$
      SELECT net.http_post(
        url := (SELECT value FROM public.app_settings WHERE key = 'edge_functions_base_url') || '/process-email-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM public.app_settings WHERE key = 'service_role_key')
        ),
        body := '{}'::jsonb
      );
    $c$
  );

  -- Nightly infra-log cleanup at 03:17 UTC.
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname = 'cleanup-infra-logs' LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
  PERFORM cron.schedule(
    'cleanup-infra-logs',
    '17 3 * * *',
    $c$ SELECT public.cleanup_infra_logs(); $c$
  );
END $$;
