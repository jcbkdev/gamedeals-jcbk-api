import { getDeal, removeDeal, saveDeal, client, getTagLib } from "../db/db";
import { Game } from "../types/game.types";

afterAll(() => {
  if (client) {
    client.close();
  }
});

test("db single cycle", async () => {
  const game: Game = {
    id: 21370000011555534793274952352374952359237459273945273945792,
    name: "TEST GAME",
    tags: ["action", "adventure"],
    platforms: ["PC", "Steam"],
    main_platform: "steam",
    description: "lorem",
    images: ["asdfads", "bvcbd"],
    end_date: "N/A",
    url: "https://google.com/",
  };
  let preDeal = await getDeal(game.id);
  if (preDeal) {
    const res = removeDeal(game.id);
    expect(res).toBeTruthy();
  }

  await saveDeal(game);
  const deal = await getDeal(game.id);
  await removeDeal(game.id);

  expect(deal).toEqual(game);
});

test("get tagLib", async () => {
  const tagLib = await getTagLib();

  expect(
    tagLib.some(
      (t) => t.name === "Horror" && t.igdb_id === 19 && t.type === "theme"
    )
  ).toBeTruthy();
});
