import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { battlefield: true },
    });

    if (!user?.battlefield) {
      return NextResponse.json({ teams: null, teamNames: null });
    }

    return NextResponse.json({
      teams: user.battlefield.teams,
      teamNames: user.battlefield.teamNames,
    });
  } catch (e) {
    console.error("GET /api/battlefield error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { teams, teamNames } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await prisma.battlefield.upsert({
      where: { userId: user.id },
      update: { teams, teamNames },
      create: { userId: user.id, teams, teamNames },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/battlefield error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}