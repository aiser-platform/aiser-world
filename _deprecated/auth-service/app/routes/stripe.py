from fastapi import APIRouter, Request, HTTPException
import os

router = APIRouter(prefix="/api/v1/billing")


@router.post('/create-checkout-session')
async def create_checkout_session(request: Request):
    # Placeholder: in production create Stripe checkout session
    data = await request.json()
    plan_type = data.get('plan_type')
    if not plan_type:
        raise HTTPException(status_code=422, detail='Missing plan_type')
    # Return a mock session id
    return {"sessionId": f"cs_test_{plan_type}_mock"}


@router.post('/webhook')
async def stripe_webhook(request: Request):
    # Placeholder webhook: accept Stripe events and return 200
    event = await request.json()
    # TODO: validate signature and process events like checkout.session.completed
    return {"received": True, "event": event.get('type')}


