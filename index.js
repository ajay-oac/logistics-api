const express = require("express");
const bodyParser = require("body-parser");
const { request, response } = require("express");
const cors = require("cors");

const {
  authenticateUser,
  getLogisticsPrices,
  createLogisticsPrices,
  getItems,
  getCartItems,
  getCartAmounts,
  addToCart,
  removeFromCart,
} = require("./queries.js");

const app = express();
const port = 3003;

app.use(cors({ origin: "*" }));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (request, response) => {
  response.json({
    info: "test info",
  });
});

app.post("/login", authenticateUser);

app.get("/logistics-prices", getLogisticsPrices);
app.post("/logistics-prices", createLogisticsPrices);

app.get("/items", getItems);

app.get("/cart-items/:cartId", getCartItems);

app.get("/cart-amounts/:cartId", getCartAmounts);

app.put("/cart-items/:cartId", addToCart);
app.delete("/cart-items/:cartId", removeFromCart);

app.listen(port, () => {});
