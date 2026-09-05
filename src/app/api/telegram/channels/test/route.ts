import { handleApiError, ok } from "@/lib/api";
import { TelegramService } from "@/lib/telegram/service";
import { ChannelTestInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = ChannelTestInput.parse(await request.json());
    const response = await new TelegramService(input.token).sendMessage(input.chatId, "✅ TG 自动发布系统连接成功");
    return ok({ messageId: response.result?.message_id });
  } catch (error) {
    return handleApiError(error);
  }
}
