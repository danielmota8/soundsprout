const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const queries = require('../queries/queries');

// 1) cria sessão de Checkout
exports.createCheckoutSession = async (req, res) => {
    const { amount, connectedAccountId, musicaId, destinatarioUsername } = req.body;

    const metadata = {
        doadorUsername: req.user.username
    };
    if (musicaId)              metadata.musicaId = musicaId;
    if (destinatarioUsername)  metadata.destinatarioUsername = destinatarioUsername;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    unit_amount: Math.round(amount * 100),
                    product_data: {
                        name: musicaId
                            ? `Donation to music #${musicaId}`
                            : `Donation to user ${destinatarioUsername}`,
                    },
                },
                quantity: 1,
            }],
            mode: 'payment',
            payment_intent_data: {
                // faz o dinheiro ir para a conta conectada
                transfer_data: { destination: connectedAccountId }
            },
            success_url: `${process.env.FRONTEND_URL}/profile/${req.user.username}?donation=success`,
            cancel_url: `${process.env.FRONTEND_URL}/profile/${req.user.username}?donation=cancel`,
            metadata
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro a criar sessão de pagamento' });
    }
};

// 2) webhook para registar no teu DB quando o pagamento acontecer
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('⚠️ Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const valor = session.amount_total / 100;
            const dono  = session.metadata.doadorUsername;
            const musicId = session.metadata.musicaId || null;
            const destUser = session.metadata.destinatarioUsername
                || (musicId
                    ? (await queries.obterMusicaById(musicId)).username
                    : null);

            await queries.fazerDoacao(
                dono,
                destUser,
                musicId,
                valor,
                new Date()
            );
            console.log('Doação gravada:', { dono, destUser, musicId, valor });
        }
        res.json({ received: true });
    } catch (err) {
        console.error('❌ Erro ao processar webhook:', err);
        res.status(500).send('Webhook handler failed');
    }
};
