import { handleApiError, ok } from "@/lib/api";
import { TelegramService } from "@/lib/telegram/service";
import { BotTestInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = BotTestInput.parse(await request.json());
    const bot = await new TelegramService(input.token).testBot();
    return ok({ id: bot?.id, username: bot?.username });
  } catch (error) {
    return handleApiError(error);
  }
}
