import { NextRequest, NextResponse } from "next/server";
import { getRoute } from "@/lib/routes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  try {
    const { routeId } = await params;
    const route = await getRoute(routeId);

    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error("Error fetching route:", error);
    return NextResponse.json(
      { error: "Failed to fetch route" },
      { status: 500 }
    );
  }
}
