import axios, { AxiosInstance } from "axios";
import { fitTelegramCaption, fitTelegramText } from "@/lib/services/template";

export type TelegramResult = {
  ok: boolean;
  result?: {
    message_id?: number;
    date?: number;
    chat?: unknown;
    username?: string;
    id?: number;
  };
  description?: string;
  error_code?: number;
};

export class TelegramService {
  private client: AxiosInstance;

  constructor(private token: string) {
    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${token}`,
      timeout: 15_000
    });
  }

  async getBotInfo() {
    const { data } = await this.client.get<TelegramResult>("/getMe");
    if (!data.ok) throw new Error(data.description || "Telegram Bot 测试失败");
    return data.result;
  }

  async testBot() {
    return this.getBotInfo();
  }

  async sendMessage(chatId: string, text: string) {
    const { data } = await this.client.post<TelegramResult>("/sendMessage", {
      chat_id: chatId,
      text: fitTelegramText(text),
      disable_web_page_preview: false
    });
    if (!data.ok) throw new Error(data.description || "Telegram 文本发送失败");
    return data;
  }

  async sendPhoto(chatId: string, photo: string, caption: string) {
    const { data } = await this.client.post<TelegramResult>("/sendPhoto", {
      chat_id: chatId,
      photo,
      caption: fitTelegramCaption(caption)
    });
    if (!data.ok) throw new Error(data.description || "Telegram 图片发送失败");
    return data;
  }

  async deleteMessage(chatId: string, messageId: number) {
    const { data } = await this.client.post<TelegramResult>("/deleteMessage", {
      chat_id: chatId,
      message_id: messageId
    });
    return data.ok;
  }
}
