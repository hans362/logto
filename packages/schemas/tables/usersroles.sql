create table users_roles (
  user_id varchar(21) references users (id) on update cascade on delete cascade,
  role_id varchar(21) references roles (id) on update cascade on delete cascade,
  primary key (user_id, role_id)
);
