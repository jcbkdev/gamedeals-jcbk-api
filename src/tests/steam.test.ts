import { Steam } from "../services/steam";

test("get steam sales", async () => {
  const sales = await Steam.fetchSales();
  console.log("Steam sales:", sales);

  expect(sales?.length).toBeGreaterThan(0);

  const properties = [
    "name",
    "discount_percent",
    "discount_expiration",
    "image",
    "url",
    "active",
  ];

  properties.forEach((property) => {
    expect(sales![0]).toHaveProperty(property);
  });
});
