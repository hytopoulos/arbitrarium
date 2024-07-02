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

        # Set the degree of persuasion to the degree which the speaker is justifying
        self.degree().value = self.speaker().get_frame("Justifying", with_content=self.content()).degree()
        # if the degree of persuasion is big enough, activate the event being persuaded
        if self.degree().value > self.addressee().get_frame("Capability", with_event=self.content()).degree():
            self.content().update()
        return True
