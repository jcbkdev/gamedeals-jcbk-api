import exp from "constants";

import { GamerpowerRes } from "../types/gamerpower.types";

import {
  getData,
  getMainPlatform,
  getPlatforms,
  getRedirect,
  parseData,
} from "../services/gamerpower";
import isUrl from "is-url";
import { Game } from "../types/game.types";

// test("gamerpower getData", async () => {
//   expect(getData).not.toThrow();
// });

test("get redirect url", async () => {
  const redirectUrl = await getRedirect(
    "https://www.gamerpower.com/open/escape-academy-epic-games-giveaway"
  );

  expect(isUrl(redirectUrl)).toBe(true);
});

describe("get platforms", () => {
  const cases = [
    ["PC", ["PC"]],
    ["PC, PS4, Steam", ["PC", "PS4", "Steam"]],
    ["PC, Epic Games Store", ["PC", "Epic Games"]],
  ];

  test.each(cases)("given %p returns %p", (arg, expectedRes) => {
    const result = getPlatforms(arg as string);
    expect(result).toStrictEqual(expectedRes);
  });
});

describe("get main platform", () => {
  const cases = [
    [["PC", "Steam"], "steam"],
    [["PC", "GOG"], "gog"],
    [["PC", "Epic Games"], "epicgames"],
    [["PC", "IndieGala"], ""],
  ];

  test.each(cases)("given %p returns %p", (arg, expectedRes) => {
    const result = getMainPlatform(arg as string[]);
    expect(result).toStrictEqual(expectedRes);
  });
});

describe("data parser", () => {
  const cases: [GamerpowerRes, Game | null][] = [
    [
      {
        id: 2716,
        title: "Escape Academy (Epic Games) Giveaway",
        worth: "$19.99",
        thumbnail: "https://www.gamerpower.com/offers/1/6592e2b40538a.jpg",
        image: "https://www.gamerpower.com/offers/1b/6592e2b40538a.jpg",
        description:
          "Become the ultimate Escapist today! Grab Escape Academy for free on Epic Games Store and escape rooms in single player or co-op!",
        instructions:
          "1. Login into your Epic Games Store account.\r\n2. Click the button to add the game to your library",
        open_giveaway_url:
          "https://www.gamerpower.com/open/escape-academy-epic-games-giveaway",
        published_date: "2025-01-16 11:00:26",
        type: "Game",
        platforms: "PC, Epic Games Store",
        end_date: "2025-01-23 23:59:00",
        users: 7440,
        status: "Active",
        gamerpower_url:
          "https://www.gamerpower.com/escape-academy-epic-games-giveaway",
        open_giveaway:
          "https://www.gamerpower.com/open/escape-academy-epic-games-giveaway",
      } as GamerpowerRes,
      {
        id: 2716,
        name: "Escape Academy",
        description:
          "Become the ultimate Escapist today! Grab Escape Academy for free on Epic Games Store and escape rooms in single player or co-op!",
        images: ["https://www.gamerpower.com/offers/1b/6592e2b40538a.jpg"],
        url: "https://store.epicgames.com/en-US/p/escape-academy-bfc2bf",
        end_date: "2025-01-23 23:59:00",
        main_platform: "epicgames",
        platforms: ["PC", "Epic Games"],
        tags: [],
      } as Game,
    ],
    [
      {
        id: 2716,
        title: "Escape Academy (Epic Games) Giveaway",
        worth: "$19.99",
        thumbnail: "https://www.gamerpower.com/offers/1/6592e2b40538a.jpg",
        image: "https://www.gamerpower.com/offers/1b/6592e2b40538a.jpg",
        description:
          "Become the ultimate Escapist today! Grab Escape Academy for free on Epic Games Store and escape rooms in single player or co-op!",
        instructions:
          "1. Login into your Epic Games Store account.\r\n2. Click the button to add the game to your library",
        open_giveaway_url:
          "https://www.gamerpower.com/open/escape-academy-epic-games-giveaway",
        published_date: "2025-01-16 11:00:26",
        type: "Game",
        platforms: "PC",
        end_date: "2025-01-23 23:59:00",
        users: 7440,
        status: "Active",
        gamerpower_url:
          "https://www.gamerpower.com/escape-academy-epic-games-giveaway",
        open_giveaway:
          "https://www.gamerpower.com/open/escape-academy-epic-games-giveaway",
      } as GamerpowerRes,
      null,
    ],
  ];

  test.each(cases)("given %p returns %p", async (arg, expectedRes) => {
    const result = await parseData(arg as GamerpowerRes);
    expect(result).toEqual(expectedRes);
  });
});
