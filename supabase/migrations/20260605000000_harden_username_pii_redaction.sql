-- Redact common PII patterns from display usernames stored in profiles.

create or replace function public.echo_clean_username(raw_username text, user_id uuid)
returns text
language plpgsql
immutable
as $$
declare
    cleaned text;
begin
    cleaned := trim(coalesce(raw_username, ''));
    cleaned := regexp_replace(
        cleaned,
        '(^|[^A-Za-z0-9])[A-Za-z]{5}[0-9]{4}[A-Za-z]([^A-Za-z0-9]|$)',
        '\1[redacted-pan]\2',
        'gi'
    );
    cleaned := regexp_replace(cleaned, '[\r\n\t]+', ' ', 'g');
    cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
    cleaned := regexp_replace(
        cleaned,
        '(^|[^A-Za-z0-9_])[A-Za-z0-9][A-Za-z0-9_.+%-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}([^A-Za-z0-9_]|$)',
        '\1[redacted-email]\2',
        'gi'
    );
    cleaned := regexp_replace(
        cleaned,
        '(^|[^0-9.])(\+?[0-9][0-9\-\s]{8,}[0-9])([^0-9.]|$)',
        '\1[redacted-phone]\3',
        'g'
    );

    if cleaned = '' then
        cleaned := 'user_' || left(replace(user_id::text, '-', ''), 8);
    end if;

    return left(cleaned, 80);
end;
$$;

update public.profiles
set username = public.echo_clean_username(username, id);
