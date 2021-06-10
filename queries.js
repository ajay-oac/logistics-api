const Pool = require("pg").Pool;

const pool = new Pool({
  user: "root",
  host: "localhost",
  database: "testdb",
  password: "root",
  port: 5432,
});

const authenticateUser = (request, response) => {
  const { username, password } = request.body;

  const query = `SELECT * FROM accounts WHERE username='${username}' AND password='${password}';`;
  pool.query(query, (error, results) => {
    if (error) {
      throw error;
    }

    const responseData = { authStatus: false };
    if (results.rows.length) {
      responseData.authStatus = true;
      if (!results.rows[0].is_store) {
        const clientId = results.rows[0].id;
        pool.query(
          `SELECT id FROM cart WHERE client_id=${clientId};`,
          (error, results) => {
            if (error) {
              throw error;
            }

            if (!results.rows.length) {
              pool.query(`SELECT * FROM cart;`, (error, results) => {
                if (error) {
                  throw error;
                }

                const cartId = results.rows.length + 1;
                pool.query(
                  `INSERT INTO cart (id, client_id) VALUES (${cartId}, ${clientId});`,
                  (error, results) => {
                    if (error) throw error;

                    responseData.cartId = cartId;
                    response.status(200).json(responseData);
                  }
                );
              });
            } else {
              responseData.cartId = results.rows[0].id;
              response.status(200).json(responseData);
            }
          }
        );
      } else response.status(200).json(responseData);
    } else response.status(401).json(responseData);
  });
};

const getLogisticsPrices = (request, response) => {
  const query = `SELECT * FROM logistics_prices;`;
  pool.query(query, (error, results) => {
    if (error) {
      throw error;
    }

    let logisticsPrices = [];
    if (results.rows.length) {
      logisticsPrices = results.rows.map((logisticsPrice) => ({
        id: logisticsPrice.id,
        minRange: logisticsPrice.min_range,
        maxRange: logisticsPrice.max_range,
        perUnitCost: logisticsPrice.per_unit_cost,
      }));
      response.status(200).json(logisticsPrices);
    } else response.status(200).json(logisticsPrices);
  });
};

const createLogisticsPrices = (request, response) => {
  const { minRange, maxRange, perUnitCost } = request.body;

  let totalLogisticsPrices = 0;
  pool.query(`SELECT * FROM logistics_prices;`, (error, results) => {
    if (error) {
      throw error;
    }

    totalLogisticsPrices = results.rows.length;

    const query = `INSERT INTO logistics_prices VALUES (${
      totalLogisticsPrices + 1
    }, ${minRange}, ${maxRange}, ${perUnitCost});`;
    pool.query(query, (error, results) => {
      if (error) {
        throw error;
      }

      response.status(201).json({ status: true, id: totalLogisticsPrices + 1 });
    });
  });
};

const getItems = (request, response) => {
  const query = `SELECT * FROM items;`;
  pool.query(query, (error, results) => {
    if (error) {
      throw error;
    }

    let items = [];
    if (results.rows.length) {
      items = results.rows;
      response.status(200).json(items);
    } else response.status(200).json(items);
  });
};

const getCartItems = (request, response) => {
  const cartId = request.params.cartId;

  const query = `SELECT * FROM cart_items WHERE cart_id=${cartId};`;
  pool.query(query, (error, results) => {
    if (error) {
      throw error;
    }

    let cartItems = [];
    if (results.rows.length) {
      pool
        .query(
          `SELECT items.id, items.name, items.price, cart_items.quantity FROM cart_items INNER JOIN items on cart_items.item_id = items.id WHERE cart_id=${cartId};`
        )
        .then((results) => {
          cartItems = results.rows;
          response.status(200).json(cartItems);
        })
        .catch((error) => {
          throw error;
        });
    } else response.status(200).json(cartItems);
  });
};

const getCartAmounts = (request, response) => {
  const cartId = request.params.cartId;

  const query = `SELECT total_quantity, total_cost, logistics_cost, net_total FROM cart WHERE id=${cartId};`;
  pool
    .query(query)
    .then((results) => {
      let cartAmounts = {
        totalQuantity: 0,
        totalCost: 0,
        logisticsCost: 0,
        netTotal: 0,
      };

      if (results.rows.length) {
        cartAmounts.totalQuantity = results.rows[0].total_quantity;
        cartAmounts.totalCost = results.rows[0].total_cost;
        cartAmounts.logisticsCost = results.rows[0].logistics_cost;
        cartAmounts.netTotal = results.rows[0].net_total;

        response.status(200).json(cartAmounts);
      } else response.status(200).json(cartAmounts);
    })
    .catch((error) => {
      throw error;
    });
};

const addToCart = (request, response) => {
  const cartId = request.params.cartId;

  pool
    .query(`SELECT total_quantity, total_cost FROM cart WHERE id=${cartId};`)
    .then((results) => {
      let totalQuantity = results.rows[0].total_quantity;
      totalQuantity = totalQuantity ? parseFloat(totalQuantity) : 0;
      let totalCost = results.rows[0].total_cost;
      totalCost = totalCost ? parseFloat(totalCost) : 0;

      totalQuantity += request.body.quantity;
      totalCost += request.body.quantity * request.body.price;

      pool
        .query(`SELECT max_range, per_unit_cost FROM logistics_prices;`)
        .then((results) => {
          const logisticsPrice = results.rows.find(
            (logisticsPrice) => totalQuantity <= logisticsPrice.max_range
          );

          const logisticsCost = logisticsPrice.per_unit_cost * totalQuantity;
          const netTotal = totalCost + logisticsCost;

          pool
            .query(
              `SELECT * FROM cart_items WHERE cart_id=${cartId} AND item_id=${request.body.id};`
            )
            .then((results) => {
              if (results.rows.length) {
                const existingQuantity = results.rows[0].quantity
                  ? parseFloat(results.rows[0].quantity)
                  : 0;
                pool.query(
                  `UPDATE cart_items SET quantity=${
                    request.body.quantity + existingQuantity
                  } WHERE cart_id=${cartId} AND item_id=${request.body.id};`
                );
              } else {
                pool.query(
                  `INSERT INTO cart_items VALUES (${cartId}, ${request.body.id}, ${request.body.quantity});`
                );
              }

              pool
                .query(
                  `UPDATE cart SET total_quantity=${totalQuantity}, total_cost=${totalCost}, logistics_cost=${logisticsCost}, net_total=${netTotal} WHERE id=${cartId};`
                )
                .then((results) => {
                  response.status(200).json({ status: true });
                })
                .catch((error) => {
                  throw error;
                });
            })
            .catch((error) => {
              throw error;
            });
        })
        .catch((error) => {
          throw error;
        });
    })
    .catch((error) => {
      throw error;
    });
};

const removeFromCart = (request, response) => {
  const cartId = request.params.cartId;

  pool
    .query(`SELECT total_quantity, total_cost FROM cart WHERE id=${cartId};`)
    .then((results) => {
      let totalQuantity = results.rows[0].total_quantity;
      totalQuantity = totalQuantity ? parseFloat(totalQuantity) : 0;
      let totalCost = results.rows[0].total_cost;
      totalCost = totalCost ? parseFloat(totalCost) : 0;

      totalQuantity -= request.body.quantity;
      totalCost -= request.body.quantity * request.body.price;

      pool
        .query(`SELECT max_range, per_unit_cost FROM logistics_prices;`)
        .then((results) => {
          const logisticsPrice = results.rows.find(
            (logisticsPrice) => totalQuantity <= logisticsPrice.max_range
          );

          const logisticsCost = logisticsPrice.per_unit_cost * totalQuantity;
          const netTotal = totalCost + logisticsCost;

          pool
            .query(
              `SELECT * FROM cart_items WHERE cart_id=${cartId} AND item_id=${request.body.id};`
            )
            .then((results) => {
              if (results.rows.length) {
                const existingQuantity = results.rows[0].quantity
                  ? parseFloat(results.rows[0].quantity)
                  : 0;
                pool.query(
                  `UPDATE cart_items SET quantity=${Math.abs(
                    request.body.quantity - existingQuantity
                  )} WHERE cart_id=${cartId} AND item_id=${request.body.id};`
                );
              } else {
                pool.query(
                  `INSERT INTO cart_items VALUES (${cartId}, ${request.body.id}, ${request.body.quantity});`
                );
              }

              pool
                .query(
                  `UPDATE cart SET total_quantity=${totalQuantity}, total_cost=${totalCost}, logistics_cost=${logisticsCost}, net_total=${netTotal} WHERE id=${cartId};`
                )
                .then((results) => {
                  response.status(200).json({ status: true });
                })
                .catch((error) => {
                  throw error;
                });
            })
            .catch((error) => {
              throw error;
            });
        })
        .catch((error) => {
          throw error;
        });
    })
    .catch((error) => {
      throw error;
    });
};

module.exports = {
  authenticateUser,
  getLogisticsPrices,
  createLogisticsPrices,
  getItems,
  getCartItems,
  getCartAmounts,
  addToCart,
  removeFromCart,
};
