-- Block by IP + device (user-agent). Blocks are keyed on (ip, user_agent):
--   user_agent = NULL  -> blocks the WHOLE IP
--   user_agent = '...' -> blocks only that device on that IP

-- 1) Blocklist table
DROP TABLE IF EXISTS public.blocked_ips;

CREATE TABLE public.blocked_ips (
  ip inet NOT NULL,
  user_agent text,                            -- NULL = block entire IP
  user_id uuid,                               -- which account this block came from
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, user_agent)
);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- 2) Prevent session creation from a blocked IP/device.
--    Fires on EVERY session insert: sign-in AND refresh-token rotation.
CREATE OR REPLACE FUNCTION public.prevent_blocked_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip = NEW.ip
      AND (user_agent IS NULL OR NEW.user_agent LIKE user_agent)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS prevent_blocked_session ON auth.sessions;
CREATE TRIGGER prevent_blocked_session
  BEFORE INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_blocked_session();

-- 3) Revoke a user: kill their auth, block every (IP, device) they used
CREATE OR REPLACE FUNCTION public.revoke_user(p_user_id uuid, p_note text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_blocked int := 0;
BEGIN
  -- Block every IP + user-agent combination this user had live sessions on
  INSERT INTO public.blocked_ips (ip, user_agent, user_id, note)
  SELECT DISTINCT s.ip, s.user_agent, p_user_id, COALESCE(p_note, 'revoked user ' || p_user_id::text)
  FROM auth.sessions s
  WHERE s.user_id = p_user_id
    AND s.ip IS NOT NULL
  ON CONFLICT (ip, user_agent) DO NOTHING;

  GET DIAGNOSTICS v_blocked = ROW_COUNT;

  -- Kill all sessions + refresh tokens (instant sign-out everywhere)
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id::text;

  -- Ban the account so even a still-valid access token is rejected
  UPDATE auth.users SET banned_until = 'infinity' WHERE id = p_user_id;

  RETURN v_blocked;
END;
$func$;

-- 4) Block a specific IP (whole IP) or one device on it
CREATE OR REPLACE FUNCTION public.block_ip(p_ip inet, p_user_agent text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  INSERT INTO public.blocked_ips (ip, user_agent, note)
  VALUES (p_ip, p_user_agent, p_note)
  ON CONFLICT (ip, user_agent) DO NOTHING;
$func$;

-- 5) Unblock a whole IP
CREATE OR REPLACE FUNCTION public.unblock_ip(p_ip inet)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  DELETE FROM public.blocked_ips WHERE ip = p_ip;
$func$;

-- 6) Unblock one device on an IP
CREATE OR REPLACE FUNCTION public.unblock_device(p_ip inet, p_user_agent text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  DELETE FROM public.blocked_ips WHERE ip = p_ip AND user_agent = p_user_agent;
$func$;

-- 7) Unblock a user entirely: remove their blocks AND unban the account
CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_removed int := 0;
BEGIN
  DELETE FROM public.blocked_ips WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;

  RETURN v_removed;
END;
$func$;

-- USAGE:
-- Revoke + block account's IPs/devices:
--   SELECT public.revoke_user('<user-uuid>', 'reason');
-- Block just an IP (all devices):
--   SELECT public.block_ip('1.2.3.4', NULL, 'suspicious');
-- Block one device on an IP:
--   SELECT public.block_ip('1.2.3.4', 'Mozilla/5.0%', 'that phone');
-- Unblock a whole IP:
--   SELECT public.unblock_ip('1.2.3.4');
-- Unblock one device:
--   SELECT public.unblock_device('1.2.3.4', 'Mozilla/5.0%');
-- Unblock a user completely (removes their blocks + unbans):
--   SELECT public.unblock_user('<user-uuid>');
-- See the blocklist:
--   SELECT * FROM public.blocked_ips;