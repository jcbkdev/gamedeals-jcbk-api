export type BearerResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type BearerData = {
  token: string;
  expire_date: number;
};

export type Field =
  | "name"
  | "artworks"
  | "cover"
  | "screenshots"
  | "storyline"
  | "genres"
  | "game_modes"
  | "summary"
  | "category"
  | "themes";

export type Tag = {
  igdb_id: number;
  name: string;
  type: "game_mode" | "theme" | "genre";
};
