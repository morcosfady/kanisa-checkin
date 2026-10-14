-- Member photo: a small (about 192px) JPEG saved as a data URL, set by an admin.
alter table members add column if not exists photo_url text;
