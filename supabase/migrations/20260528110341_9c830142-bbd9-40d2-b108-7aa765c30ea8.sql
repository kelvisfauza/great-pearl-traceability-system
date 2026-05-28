UPDATE public.approval_requests
SET amount = 150000,
    details = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(details, '{}'::jsonb),
          '{excluded_emails}',
          '["bwambaletony@greatpearlcoffee.com","sserunkumataufiq@greatpearlcoffee.com","operations@greatpearlcoffee.com"]'::jsonb
        ),
        '{recipients_count}', '11'::jsonb
      ),
      '{excluded_reason}', '"Removed by Fauza prior to approval"'::jsonb
    )
WHERE id = '44964ebc-09bc-4980-a571-674728258f99';