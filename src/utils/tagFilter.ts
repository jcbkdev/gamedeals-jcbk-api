import { Game } from "../types/game.types";
import { Tag } from "../types/igdb.types";

type resGame = { genres: number[]; game_modes: number[]; themes: number[] };

function isGame(obj: any): obj is resGame {
  return (
    obj &&
    typeof obj === "object" &&
    "genres" in obj &&
    "game_modes" in obj &&
    "themes" in obj
  );
}

export function tagFilter(toFilter: Tag[] | Object, tagLib: Tag[]): Tag[] {
  const isArray = Array.isArray(toFilter);
  let tagCollection: Tag[];
  if (!isArray) {
    if (!isGame(toFilter)) throw new Error("Wrong object passed");
    const idGenres: Tag[] = toFilter["genres"].map(
      (e: number) =>
        ({
          igdb_id: e,
          name: "",
          type: "genre",
        } as Tag)
    );
    const idGameModes: Tag[] = toFilter["game_modes"].map(
      (e: number) =>
        ({
          igdb_id: e,
          name: "",
          type: "game_mode",
        } as Tag)
    );
    const idThemes: Tag[] = toFilter["themes"].map(
      (e: number) =>
        ({
          igdb_id: e,
          name: "",
          type: "theme",
        } as Tag)
    );

    tagCollection = [...idGenres, ...idGameModes, ...idThemes];
  } else {
    tagCollection = toFilter;
  }

  const tags: Tag[] = tagCollection.flatMap((tag) => {
    const matchedTag = tagLib.find(
      (t) => t.igdb_id === tag.igdb_id && t.type === tag.type
    );
    return matchedTag ? matchedTag : [];
  });

  return tags;
}
