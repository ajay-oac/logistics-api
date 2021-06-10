# logistics-api
API for logistics Front End

Prerequisite- 
1. Postgres v9.5 or above.
2. Create user "root" and set password "root".
3. Create tables via "root" user - 
  - CREATE TABLE accounts (ID SERIAL PRIMARY KEY, is_store BOOLEAN, username VARCHAR(30), password VARCHAR(30));
  - CREATE TABLE logistics_prices (ID SERIAL PRIMARY KEY, min_range NUMERIC(7,0), max_range NUMERIC(7,0), per_unit_cost NUMERIC(7,2));
  - CREATE TABLE items (ID SERIAL PRIMARY KEY, name VARCHAR(30), quantity NUMERIC(7,0), price NUMERIC(7,2));
  - CREATE TABLE cart (ID SERIAL PRIMARY KEY, client_id NUMERIC(7), total_quantity NUMERIC(7,0), total_cost NUMERIC(7,2), logistics_cost NUMERIC(7,2), net_total NUMERIC(7,2));
  - CREATE TABLE cart_items (cart_id NUMERIC(7), item_id NUMERIC(7), quantity NUMERIC(7,0), PRIMARY KEY(cart_id, item_id));
4. Setup dummy data -
  - INSERT INTO accounts VALUES (1, 'true', 'store@logistics', 'password');
  - INSERT INTO accounts VALUES (2, 'false', 'client@logistics', 'password');
5. run - npm install to install all the dependencies.
