import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: Request) {
  const { credits } = await req.json();

  let amount = 300; // default $3

  if (credits === 5) amount = 1500;
  if (credits === 10) amount = 3000;
  if (credits === 20) amount = 6000;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} EasyPips Credits`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}?success=true&credits=${credits}`,
      cancel_url: `${APP_URL}?cancel=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}