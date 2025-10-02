import asyncio

# Compatibility shim for litellm used in tests/development
drop_params = False

class _Msg:
    def __init__(self, content: str):
        self.content = content

class _Choice:
    def __init__(self, content: str):
        self.message = _Msg(content)
        self.delta = type('d', (), {'content': ''})()

class _Response:
    def __init__(self, content: str = "{\"message\": \"stub\"}"):
        self.choices = [_Choice(content)]
        self.usage = None

async def acompletion(**kwargs):
    # simulate minimal async response
    await asyncio.sleep(0)
    return _Response('{"message": "stub"}')

async def completion(**kwargs):
    await asyncio.sleep(0)
    return _Response('{"message": "stub"}')


