from typing import Any
from arb.element import Element
from arb.util import log

class Frame:
    """
    Instance of a Framenet Frame.

    Frames describe attributes of Entities and relations to others
    """

    def __init__(self, fnframe: dict[str, object]) -> None:
        # Copy attributes from frame
        self.name: str
        self.ID: int
        self.semTypes: list[Any]
        self.lexUnit: dict[str, Any]
        self.FE: dict[Any, Any]
        self.frameRelation: dict[Any, Any]
        self.FEcoreSets: dict[Any, Any]
        for attr in fnframe:
            setattr(self, attr, fnframe[attr])
        self.elements = [Element(e) for e in self.FE.values()]

    def __repr__(self) -> str:
        return f"{self.name}:{self.elements}"

    def update(self) -> bool:
        return True

    def speaker(self) -> Element | None:
        return next(filter(self.elements, lambda e: e.name == "Speaker"), None)

    def addressee(self) -> Element | None:
        return next(filter(self.elements, lambda e: e.name == "Addressee"), None)

    def content(self) -> Element | None:
        return next(filter(self.elements, lambda e: e.name == "Content"), None)

    def degree(self) -> Element | None:
        return next(filter(self.elements, lambda e: e.name == "Degree"), None)
