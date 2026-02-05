import { messaging } from "../config/firebase";
import { getAllSubscribers, removeTokens } from "../db/db";
import { NOTIFICATION_PLATFORMS } from "../types/notification.types";

export async function broadcastNotification(
  title: string,
  body: string,
  platform: NOTIFICATION_PLATFORMS
) {
  let tokens = await getAllSubscribers();

  tokens = tokens.filter((t) => t.platforms.includes(platform));

  if (tokens.length === 0) {
    console.log("No subscribers to notify.");
    return;
  }

  const chunks = [];
  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    chunks.push(tokens.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    let tokens = chunk.map((c) => c.token);

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    try {
      const response = await messaging.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(chunk[idx].token);
          }
        });
        if (failedTokens.length > 0) {
          await removeTokens(failedTokens);
        }
      }
      console.log(
        `Batch sent: ${response.successCount} success, ${response.failureCount} fail`
      );
    } catch (error) {
      console.error("Error sending batch", error);
    }
  }
}
