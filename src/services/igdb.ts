import axios from "axios";
import { BearerData, BearerResponse, Field, Tag } from "../types/igdb.types";

export class IGDB {
  private clientId: string;
  private clientSecret: string;
  private static bearerData: BearerData | undefined;
  constructor(igdb_id: string, igdb_secret: string) {
    this.clientId = igdb_id;
    this.clientSecret = igdb_secret;
  }

  private async getBearer() {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`;
    const response = await axios.post(url).catch((err) => {
      throw new Error(err);
    });
    if (!response) throw Error("Couldn't get a bearer token");

    const responseData: BearerResponse = response.data;

    const token = "Bearer " + responseData.access_token;
    const expireDate = Date.now() + responseData.expires_in * 1000;

    const bearer: BearerData = {
      token: token,
      expire_date: expireDate,
    };

    IGDB.bearerData = bearer;
  }

  private isBearerActive(): boolean {
    if (!IGDB.bearerData) return false;
    const now = Date.now();
    if (IGDB.bearerData.expire_date <= now) return false;
    return true;
  }

  private async getAuthHeader(): Promise<{
    "Client-ID": string;
    Authorization: string;
  }> {
    if (!this.isBearerActive()) {
      await this.getBearer();
    }
    if (!IGDB.bearerData) throw Error("bearerData is missing");
    return { "Client-ID": this.clientId, Authorization: IGDB.bearerData.token };
  }

  public async search(
    title: string,
    fields: Field[],
    where?: { field: Field; value: string }
  ) {
    const url = "https://api.igdb.com/v4/games";

    const headers = await this.getAuthHeader();
    const body = `fields ${fields.join(",")};search: "${title}";${
      where ? `where ${where.field} = ${where.value}` : ""
    };`;

    const response = await axios
      .post(url, body, { headers: headers })
      .catch((err) => {
        throw new Error(err);
      });
    if (!response.data) throw new Error("error getting a response from IGDB");

    return response.data;
  }

  public async getCoverHash(coverId: number) {
    const url = "https://api.igdb.com/v4/covers";

    const headers = await this.getAuthHeader();
    const body = `fields image_id;where id = ${coverId};`;

    const response = await axios
      .post(url, body, { headers: headers })
      .catch((err) => {
        throw new Error(err);
      });
    if (!response.data)
      throw new Error("error getting cover from IGDB, coverId: " + coverId);

    if (response.data[0].image_id) {
      return response.data[0].image_id;
    } else {
      throw new Error(
        "For some reason the cover does not have an image_id property"
      );
    }
  }

  /**
   *
   * @param imageHash - string hash of an image
   * @returns array of images, which consists of a big_cover array[0] and 720p array[1] sized images
   */
  public async getCoverImageSet(imageHash: string): Promise<string[]> {
    const imageSmall = await this.getCoverImage("small", imageHash);
    const imageBig = await this.getCoverImage("big", imageHash);
    return [imageSmall, imageBig];
  }

  /**
   *
   * @param size - "small" or "big"
   * @param imageHash - string hash of an image
   * @returns Image hash
   */
  public async getCoverImage(
    size: "small" | "big",
    imageHash: string
  ): Promise<string> {
    const savePath = "./data/images/";

    let imageSize;
    switch (size) {
      case "small":
        imageSize = "cover_big";
        break;
      case "big":
        imageSize = "720p";
        break;
      default:
        imageSize = "cover_big";
        break;
    }

    const url = `https://images.igdb.com/igdb/image/upload/t_${imageSize}/${imageHash}.jpg`;

    const response = await axios
      .get(url, { responseType: "arraybuffer" })
      .catch((err) => {
        throw new Error(err);
      });

    return response.data;
  }

  private async fetchThemes(): Promise<Tag[]> {
    const url = "https://api.igdb.com/v4/themes";

    const headers = await this.getAuthHeader();
    const body = "fields name;limit 100;";

    const response = await axios
      .post(url, body, { headers: headers })
      .catch((err) => {
        throw new Error(err);
      });

    const themes: Tag[] = [];

    for (let t of response.data) {
      if (t.id && t.name) {
        const igdb_id = t.id as number;
        const name = t.name as string;

        const theme: Tag = {
          igdb_id: igdb_id,
          name: name,
          type: "theme",
        };

        themes.push(theme);
      }
    }

    return themes;
  }

  private async fetchGenres(): Promise<Tag[]> {
    const url = "https://api.igdb.com/v4/genres";

    const headers = await this.getAuthHeader();
    const body = "fields name;limit 100;";

    const response = await axios
      .post(url, body, { headers: headers })
      .catch((err) => {
        throw new Error(err);
      });

    const genres: Tag[] = [];

    for (let g of response.data) {
      if (g.id && g.name) {
        const igdb_id = g.id as number;
        const name = g.name as string;

        const genre: Tag = {
          igdb_id: igdb_id,
          name: name,
          type: "genre",
        };

        genres.push(genre);
      }
    }

    return genres;
  }

  private async fetchGameModes(): Promise<Tag[]> {
    const url = "https://api.igdb.com/v4/game_modes";

    const headers = await this.getAuthHeader();
    const body = "fields name;limit 100;";

    const response = await axios
      .post(url, body, { headers: headers })
      .catch((err) => {
        throw new Error(err);
      });

    const gameModes: Tag[] = [];

    for (let gm of response.data) {
      if (gm.id && gm.name) {
        const igdb_id = gm.id as number;
        const name = gm.name as string;

        const gameMode: Tag = {
          igdb_id: igdb_id,
          name: name,
          type: "game_mode",
        };

        gameModes.push(gameMode);
      }
    }

    return gameModes;
  }

  public async getTags() {
    const themes = await this.fetchThemes();
    const genres = await this.fetchGenres();
    const gameModes = await this.fetchGameModes();

    const tags: Tag[] = [...themes, ...genres, ...gameModes];

    return tags;
  }
}
