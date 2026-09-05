import { handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { SourceInput } from "@/lib/validators";

export async function GET() {
  const sources = await prisma.source.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } }
  });
  return ok(sources);
}

export async function POST(request: Request) {
  try {
    const input = SourceInput.parse(await request.json());
    const source = await prisma.source.create({ data: input });
    return ok(source, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
