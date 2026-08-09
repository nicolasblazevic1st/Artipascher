import { NextRequest, NextResponse } from "next/server";
import {
  ANTI_CHURN_RETIRED,
  ANTI_CHURN_RETIRED_MESSAGE,
  retiredFeatureJson,
} from "@/lib/product-features";

export async function GET() {
  if (ANTI_CHURN_RETIRED) {
    return NextResponse.json(retiredFeatureJson(ANTI_CHURN_RETIRED_MESSAGE), {
      status: 410,
    });
  }
  return NextResponse.json({ unlocked: false });
}

export async function POST(_request: NextRequest) {
  if (ANTI_CHURN_RETIRED) {
    return NextResponse.json(retiredFeatureJson(ANTI_CHURN_RETIRED_MESSAGE), {
      status: 410,
    });
  }
  return NextResponse.json(
    retiredFeatureJson(ANTI_CHURN_RETIRED_MESSAGE),
    { status: 410 }
  );
}
