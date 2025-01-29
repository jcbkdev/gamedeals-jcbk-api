import { IGDB } from "../services/igdb";
import { tagFilter } from "../utils/tagFilter";

const client = new IGDB(
  "eeypmrbeo1ki0u1rpezzghub91dtun",
  "hejxbzh7aklk10e651tyes5ecbof1n"
);

test("search", async () => {
  const response = await client.search(
    "grand theft auto v",
    ["name", "category", "cover"],
    {
      field: "category",
      value: "0",
    }
  );
  expect(response[0]["category"]).toEqual(0);
  expect(response[0]["name"]).toEqual("Grand Theft Auto V");
  expect(response[0]["id"]).toEqual(1020);
});

test("get cover hash", async () => {
  const response = await client.search(
    "grand theft auto v",
    ["name", "category", "cover"],
    {
      field: "category",
      value: "0",
    }
  );
  expect(response[0]["id"]).toEqual(1020);
  expect(response[0]).toHaveProperty("cover");

  const imageHash = await client.getCoverHash(response[0]["cover"]);

  expect(imageHash).toEqual("co2lbd");
});

test("get image", async () => {
  await expect(client.getCoverImageSet("co2lbd")).resolves.not.toThrow();
});

test("tags", async () => {
  const response = await client.search(
    "Grand Theft Auto V",
    ["genres", "game_modes", "themes"],
    {
      field: "category",
      value: "0",
    }
  );

  const game = response[0];
  const tagLib = await client.getTags();

  const tags = tagFilter(game, tagLib);

  const expectedNames: string[] = [
    "Shooter",
    "Racing",
    "Adventure",
    "Action",
    "Comedy",
    "Sandbox",
    "Open world",
    "Single player",
    "Multiplayer",
    "Co-operative",
  ];

  const isAll = expectedNames.every((name) =>
    tags.some((tag) => tag.name === name)
  );

  expect(isAll).toBeTruthy();
});
