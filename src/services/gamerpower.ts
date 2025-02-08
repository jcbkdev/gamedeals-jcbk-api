import axios from "axios";
import { Game } from "../types/game.types";
import isUrl from "is-url";
import { GamerpowerRes } from "../types/gamerpower.types";

/**
 * Returns data from Gamerpower API
 */
async function fetchData(): Promise<GamerpowerRes[]> {
  const response = await axios.get(
    "https://www.gamerpower.com/api/giveaways?type=game&platform=pc&status=active"
  );

  if (!response.data) {
    throw new Error("Could not fetch any data | Gamerpower");
  }

  return response.data;
}

/**
 * Removes the unnecessary things like "...(Epic Games) Giveaway!"
 * @param title - game title
 * @param platformName - full platform name like: "Epic Games", "Steam" or "GOG"
 */
function cleanupTitle(title: string, platformName: string) {
  const escapedPlatform = platformName.replace(
    /[.*+?^=!:${}()|\[\]\/\\]/g,
    "\\$&"
  );

  const platformRegex = new RegExp(
    `(?:\\(${escapedPlatform}\\)|${escapedPlatform})`,
    "i"
  );

  const matchIndex = title.search(platformRegex);

  if (matchIndex !== -1) {
    return title.slice(0, matchIndex).trim();
  }

  return title;
}

/**
 * Converts a string of platforms to an array, also modifying name "Epic Games Store" to "Epic Games"
 * @param platforms
 * @returns
 */
export function getPlatforms(platforms: string): string[] {
  return platforms
    .split(", ")
    .map((p) => (p === "Epic Games Store" ? "Epic Games" : p));
}

/**
 * Gets the main platform that the deal belongs to
 * @param platforms
 * @returns
 */
export function getMainPlatform(platforms: string[]): string {
  const accepted = ["steam", "epicgames", "gog"];
  let mainPlatform = "";

  platforms.map((p) => {
    let converted = p.toLowerCase().replace(" ", "");
    if (accepted.includes(converted)) mainPlatform = converted;
  });

  return mainPlatform;
}

export async function getRedirect(url: string): Promise<string> {
  const redirectUrl = (await axios
    .get(url)
    .then((response) => {
      const red = response.request.res.responseUrl;
      if (red) return red;
      return "";
    })
    .catch((err) => {
      const red = err.request.res.responseUrl;
      if (red) return red;
      return "";
    })) as string;

  //Handle invalid response
  if (!redirectUrl || !isUrl(redirectUrl)) {
    return url;
  }

  return redirectUrl;
}

function getPlatformFullName(platform: string) {
  switch (platform) {
    case "steam":
      return "Steam";
    case "epicgames":
      return "Epic Games";
    case "gog":
      return "GOG";
    default:
      return platform;
  }
}

/**
 * Converts a single GamerpowerRes object to a Game object
 * @param gameData
 */
export async function parseData(gameData: GamerpowerRes): Promise<Game | null> {
  const platforms = getPlatforms(gameData.platforms);
  const mainPlatform = getMainPlatform(platforms);

  if (!mainPlatform) return null;

  const url = await getRedirect(gameData.open_giveaway_url);
  const title = cleanupTitle(gameData.title, getPlatformFullName(mainPlatform));

  const game: Game = {
    id: gameData.id,
    name: title,
    description: gameData.description,
    main_platform: mainPlatform,
    platforms: platforms,
    tags: [],
    images: [gameData.image],
    url: url,
    end_date: gameData.end_date,
    active: true,
  };

  return game;
}

export async function getData(): Promise<Game[]> {
  const data = await fetchData();
  const games: Game[] = [];

  for (const d of data) {
    const game = await parseData(d);
    if (game) games.push(game);
  }

  return games;
}
