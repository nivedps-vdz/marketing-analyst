"""Sorting helpers. Undefined values (None) always sort last, in either direction."""

from collections.abc import Callable, Sequence
from typing import Any, TypeVar

T = TypeVar("T")


def sort_nulls_last(
    items: Sequence[T], key: Callable[[T], Any], *, descending: bool, tiebreak: Callable[[T], Any] | None = None
) -> list[T]:
    defined = [i for i in items if key(i) is not None]
    undefined = [i for i in items if key(i) is None]
    if tiebreak is not None:
        defined.sort(key=tiebreak)
        undefined.sort(key=tiebreak)
    defined.sort(key=key, reverse=descending)  # stable sort keeps tiebreak order for equal keys
    return defined + undefined
