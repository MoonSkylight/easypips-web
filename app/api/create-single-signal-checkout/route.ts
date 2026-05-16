import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signalId = body.signalId || "single-signal";

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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/premium-success?signal=${signalId}`,
 
     cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/live-signals`,
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





