from app.modules.user.services import UserService


async def current_user_from_service(token: str):
    """
    Get current user from token
    """
    try:
        service = UserService()
        return await service.get_me(token)
    except Exception as e:
        raise e
