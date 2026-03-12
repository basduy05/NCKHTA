import asyncio
import functools
import logging
import traceback
from typing import Callable, Any, Type, Tuple

logger = logging.getLogger(__name__)

def retry(
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    tries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    logger: logging.Logger = logger,
):
    """
    Retry decorator with exponential backoff.
    """
    def decorator(func: Callable):
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                _tries, _delay = tries, delay
                while _tries > 1:
                    try:
                        return await func(*args, **kwargs)
                    except exceptions as e:
                        logger.warning(
                            f"Retrying {func.__name__} in {_delay}s... Error: {e}\n"
                            f"{traceback.format_exc() if _tries == 2 else ''}"
                        )
                        await asyncio.sleep(_delay)
                        _tries -= 1
                        _delay *= backoff
                return await func(*args, **kwargs)
            return wrapper
        else:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                _tries, _delay = tries, delay
                import time
                while _tries > 1:
                    try:
                        return func(*args, **kwargs)
                    except exceptions as e:
                        logger.warning(
                            f"Retrying {func.__name__} in {_delay}s... Error: {e}"
                        )
                        time.sleep(_delay)
                        _tries -= 1
                        _delay *= backoff
                return func(*args, **kwargs)
            return wrapper
    return decorator
