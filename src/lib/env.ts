export const appEnv = {
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  appTimezone: process.env.APP_TIMEZONE || "Asia/Shanghai",
  crawlerUserAgent: process.env.CRAWLER_USER_AGENT || "TGContentDistributor/1.0",
  aiBaseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  aiApiKey: process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gpt-4o-mini"
};
