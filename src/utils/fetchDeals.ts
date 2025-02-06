import { getAllDeals, getTagLib } from "../db/db";
import { getData } from "../services/gamerpower";
import { IGDB } from "../services/igdb";
import { Game } from "../types/game.types";
import { tagFilter } from "./tagFilter";

export async function fetchDeals(): Promise<Game[]> {
  const igdbClientId = process.env.IGDB_ID;
  const igdbSecret = process.env.IGDB_SECRET;

  if (!igdbClientId || !igdbSecret)
    throw new Error("Could not access IGDB credentials");

  console.log("getting gamerpower data...");
  const gpData = await getData();

  const dbDeals = await getAllDeals();
  const filteredGpData = gpData.filter((gpDeal) => {
    //remove the incorrect date
    if (Number.isNaN(Date.parse(gpDeal.end_date))) return false;

    //find a matching game
    const matchingGame = dbDeals.find((d) => d.id === gpDeal.id);
    if (!matchingGame) return true; //if no matches then keep the game

    //if the match has the same name, end_date and main_platfrom then skip it
    if (
      matchingGame.name === gpDeal.name &&
      matchingGame.end_date === gpDeal.end_date &&
      matchingGame.main_platform === gpDeal.main_platform
    ) {
      console.log(
        `Skipping duplicate:\nid:${matchingGame.id}\nname:${matchingGame.name}`
      );
      return false;
    }
    return true;
  });

  if (filteredGpData.length === 0) {
    console.log("No new deals found \n Returning an empty array...");
    return [];
  }
  const igdbClient = new IGDB(igdbClientId, igdbSecret);

  console.log("mapping games...");
  const mappedGames: Game[] = await Promise.all(
    filteredGpData.map(async (game) => {
      console.log("searching for: ", game.name);
      let igdbGame;
      try {
        igdbGame = await igdbClient
          .search(
            game.name,
            [
              "name",
              "summary",
              "cover",
              "category",
              "themes",
              "genres",
              "game_modes",
            ],
            { field: "category", value: "0" }
          )
          .then((res) => res[0]);
      } catch (err) {
        console.error(
          `An error occured while searching for a game: ${game.name}`,
          err
        );

        return game;
      }

      console.log("igdbgame:", igdbGame);

      const description = igdbGame["summary"];

      const tagLib = await getTagLib();

      const tags = await tagFilter(igdbGame, tagLib);

      // GET images in a binary format
      const imageHash = await igdbClient.getCoverHash(igdbGame["cover"]);
      const images: string[] = await igdbClient.getCoverImageSet(imageHash);

      let gameObj: Game = game;
      gameObj.description = description;
      gameObj.images = [...images];
      gameObj.tags = tags.map((t) => t.name);

      return gameObj;
    })
  );
  console.log("mapped games");

  return mappedGames;
}
