from arb.util import log
from .frame import Frame

class Suasion(Frame):
    def __init__(self, frame: dict[str, object]):
        super().__init__(frame)

    def ask_for_elements(self):
        # Convince [Addressee] of what? -> Content
        # How much? -> [0%-100%] {Conservative in my effort, expend all my energy}
        # i.e. sacrifice other states for this one
        pass

    def update(self) -> bool:
        if not self.speaker():
            log.warning(f"tried to update with no Speaker")
            return False
        if not self.addressee():
            log.warning(f"tried to update with no Addressee")
            return False
        if not self.content():
            log.warning(f"tried to update with no Content")
            return False
        if not self.degree():
            log.warning(f"tried to update with no Degree")
            return False

        self.degree().value = self.speaker().value
        return True
# def suasion(frame):
#     speaker = Suasion.Speaker
#     addressee = Suasion.Addressee
#     Suasion.degree = speaker.Justifying[content=Suasion.Content].degree
#     If Suasion.degree > addressee.Capability[Event=Suasion.Content].degree
