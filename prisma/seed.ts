import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "change-me-now";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        name: "Administrator"
      }
    });
  }

  await prisma.publishTemplate.upsert({
    where: { id: "default-template" },
    update: {
      body: "{{emoji}} {{title}}\n\n{{summary}}\n\n{{tags}}\n\n👇 点击下方按钮查看完整视频"
    },
    create: {
      id: "default-template",
      name: "默认资讯模板",
      body: "{{emoji}} {{title}}\n\n{{summary}}\n\n{{tags}}\n\n👇 点击下方按钮查看完整视频"
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
