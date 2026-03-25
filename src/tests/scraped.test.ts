import { ScrapedDatabase } from "../services/scraped";

test("get steam sales", async () => {
  const sales = await ScrapedDatabase.fetchSales();
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
