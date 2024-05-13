import Logo from "@/logo";

import StripeEmbeddedCheckout from "./components/StripeEmbeddedCheckout";

export default async function StorePaymentsPage() {

    return (
        <div className='h-full flex items-center justify-center p-12'>
            <div className='h-full flex flex-col items-center gap-12'>
                <Logo withText />
                <h1 className='md:text-4xl text-3xl font-semibold'>Please enter your payment details below</h1>
                <p>We use Stripe to manage our payments</p>
                <StripeEmbeddedCheckout/>
            </div>
        </div>
    )
}