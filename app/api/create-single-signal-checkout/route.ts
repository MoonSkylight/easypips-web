import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe secret key is missing" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);

    const body = await req.json();
    const signalId = body.signalId || "single-signal";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://easypips-web.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "EasyPips Premium Signal Unlock",
              description: `Single premium signal access: ${signalId}`,
            },
            unit_amount: 300,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/premium-success?signal=${signalId}`,
      cancel_url: `${siteUrl}/live-signals`,
      metadata: {
        signalId,
        type: "single_signal_unlock",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 }
    );
  }
}