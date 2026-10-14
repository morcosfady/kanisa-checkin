-- Run this on its own first (new enum values must be committed before they are used).
alter type app_role add value if not exists 'member';
alter type checkin_method add value if not exists 'self';
