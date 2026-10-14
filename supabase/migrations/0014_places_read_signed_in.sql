-- People who just created an account (not approved yet) must be able to read the city and church lists
-- while filling in their profile. Signed-out visitors still get nothing.
drop policy if exists cities_read on cities;
drop policy if exists churches_read on churches;
create policy cities_read on cities for select using (auth.uid() is not null);
create policy churches_read on churches for select using (auth.uid() is not null);
