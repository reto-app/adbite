-- An account is a shop or an advertiser, chosen once. lib/account.ts only
-- writes the role while it is null; this makes the database refuse the change
-- too, so nothing that talks to the table directly can flip a side.
create or replace function keep_role_final() returns trigger
language plpgsql as $$
begin
  if old.role is not null and new.role is distinct from old.role then
    raise exception 'account role cannot be changed once set';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_role_final on accounts;
create trigger accounts_role_final
  before update of role on accounts
  for each row execute function keep_role_final();
