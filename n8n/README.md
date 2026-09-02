# n8n → personalised review link

Sends each customer a review link that carries their id, so the review arrives
already tagged with who wrote it.

```
n8n webhook  ──►  builds  …/pages/reviews?cid=ORD-1042  ──►  WhatsApp / email
                                                                    │
                                          customer opens link, submits form
                                                                    ▼
                                       Supabase row with customer_id = ORD-1042
                                                                    ▼
                                       dashboard shows the id next to the name
```

## Install

1. n8n → **Workflows → Import from File** → pick
   [`review-link-workflow.json`](review-link-workflow.json).
2. The webhook path is already set to your existing endpoint:
   `https://n8n.srv1155688.hstgr.cloud/webhook/f4cac442-9153-41ed-b22f-150ae40e8d48`
3. Open **Build link + message** and check `BASE` on the first line matches your
   real review page URL.
4. Add credentials for whichever channel you use (see below).
5. **Activate** the workflow.

## Calling it

`POST` to the webhook URL with JSON:

```json
{
  "name": "Heba",
  "phone": "01012345678",
  "order_number": "1042",
  "lang": "ar",
  "channel": "whatsapp"
}
```

| Field | Required | Notes |
|---|---|---|
| `customer_id` | one of these two | Used verbatim as the id |
| `order_number` | one of these two | Becomes `ORD-1042` if no `customer_id` |
| `name` | no | Used in the greeting; omitted cleanly if missing |
| `phone` | for WhatsApp | Any format — `01012345678` is normalised to `201012345678` |
| `email` | for email | |
| `lang` | no | `ar` (default) or `en` |
| `channel` | no | `whatsapp`, `email`, or `link`. Auto-picked from what you send |

Response:

```json
{
  "ok": true,
  "customer_id": "ORD-1042",
  "link": "https://beauty-bareg.net/pages/reviews?cid=ORD-1042",
  "channel": "whatsapp",
  "message": "أهلاً Heba،\n\nشكراً لطلبك رقم 1042 …"
}
```

Because the link comes back in the response, you can use `"channel": "link"` and
send it yourself — from Shopify Flow, a Google Sheet, or by hand — without
configuring any sending credentials in n8n.

## Sending channels

**WhatsApp** — the `Send WhatsApp` node calls the Meta Cloud API. Set two n8n
variables (Settings → Variables): `WA_PHONE_NUMBER_ID` and `WA_TOKEN`.

> Meta only allows free-form text within 24 h of the customer's last message to
> you. For post-delivery outreach you need an approved **template** message —
> change the node's JSON body to
> `{"messaging_product":"whatsapp","to":…,"type":"template","template":{…}}`.
> If you use a non-official WhatsApp provider instead, just point the node's URL
> at their send endpoint.

**Email** — the `Send Email` node needs an SMTP credential; also set a real
`fromEmail` on a domain you can send from.

## Hooking it to Shopify

Shopify admin → **Settings → Notifications → Workflows** (Shopify Flow):
trigger **Order fulfilled** (or a 3-day delay after it) → **Send HTTP request**
→ POST to the webhook URL with the body above, mapping
`order.customer.firstName`, `order.customer.phone`, `order.name`.

## Checking it works

```bash
curl -X POST https://n8n.srv1155688.hstgr.cloud/webhook/f4cac442-9153-41ed-b22f-150ae40e8d48 \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","order_number":"9999","channel":"link"}'
```

Open the returned link — the form shows a small **"Linked to your order
ORD-9999"** badge. Submit it, and the id appears as an orange chip beside the
name on the dashboard. It is also searchable and included in the CSV export.

## Note on link format

Use `?cid=…`. A path-style link (`/pages/reviews/ORD-1042`) **404s on Shopify** —
pages have no sub-paths. The form also accepts `#ORD-1042` if you prefer a
cleaner-looking link.
