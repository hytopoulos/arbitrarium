import inspect
from typing import Any
from .frame import Frame
from .suasion import Suasion
import arb.util as util

frames = {
    k: v for k, v in inspect.getmembers(inspect.getmodule(inspect.currentframe()))
    if isinstance(v, type) and issubclass(v, Frame)
}


def wrap_fnframe(fnframe: dict[Any, Any]) -> Frame:
    f: type[Frame] = frames.get(fnframe["name"], Frame)
    return f(fnframe)


def make_frame(phrase: str) -> Frame | None:
    phrase_ss = util.get_synset(phrase)
    if phrase_ss is None:
        util.log.warning(f"No synset found for {phrase}")
        return None
    lu = util.ss2lu(phrase_ss)
    if lu is None:
        return None

    return wrap_fnframe(lu.frame)
