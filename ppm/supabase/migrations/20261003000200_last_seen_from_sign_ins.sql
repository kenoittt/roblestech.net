-- People who used the PPM before the revamp have never been "seen" by it: last_seen_at
-- is new (20261002000200). The People screen treats an empty last_seen_at as "Invited",
-- which would label the whole existing team as invited after the switch and offer
-- "Resend invitation" instead of "Send password reset". Fill it from each account's last
-- sign-in. Data only; touches only rows still empty, so running it again changes nothing.
update public.profiles p
set last_seen_at = u.last_sign_in_at
from auth.users u
where u.id = p.id
  and p.last_seen_at is null
  and u.last_sign_in_at is not null;
