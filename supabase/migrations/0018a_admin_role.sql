-- Run on its own first (new enum value must be committed before use).
alter type app_role add value if not exists 'admin';
