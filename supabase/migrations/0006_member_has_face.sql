-- true once at least one face template is enrolled (embeddings themselves are never readable from the client)
alter table members add column has_face boolean not null default false;
