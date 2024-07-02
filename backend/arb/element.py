from typing import Any
from nltk.corpus import framenet as fn
import arb.util as util

class Element:
    '''Instance of a FrameNet Frame Element'''
    def __init__(self, fnfe: dict[Any, Any]):
        # Copy attributes from frame element
        self.name: str
        self.ID: int
        self.semType: dict[str, object] | None
        for attr in fnfe:
            setattr(self, attr, fnfe[attr])
        self.value = None
        if self.semType is not None:
            self.value = util.get_semtype_default(self.semType.ID)

    def __repr__(self) -> str:
        return f"{self.name}/{fn.semtype(self.semType.ID).name if self.semType else None}={self.value}"
