from nltk.corpus import wordnet as wn
from nltk.corpus import framenet as fn
from nltk.corpus.reader.wordnet import Lemma, Synset
import numpy as np
from sty import fg, bg, ef, rs
import arb.util as util
from arb.util import log

class Entity:
    '''
    Stateful object/noun, defined by wordnet and framenet relations
    '''

    def __init__(self, synset: Synset):
        self.synset: Synset = synset
        self.name = self.gen_lemma().name().replace("_", " ")
        self.base_frame = None
        self.frame_relations = []
        self.active_frames = []
        self.lexunit = util.ss2lu(synset)
        if self.lexunit:
            self.base_frame = self.lexunit.frame
            self.frame_relations = list(self.inherited_frame_relations_iter(self.lexunit))
            log.info(f"num. frame rels: {len(self.frame_relations)}")
        else:
            pass # TODO: what if the entity isnt found in framenet?

    @staticmethod
    def from_name(name: str):
        ''' Create an entity from a word, picking the most likely lemma. '''
        ss = util.get_synset(name)
        if ss is None:
            raise ValueError(f"No synset found for {name}")
        return Entity(ss)

    @staticmethod
    def from_root(synset: Synset, depth=1, weighted_by_freq=True):
        hypo = lambda s: s.hyponyms()
        hypos = synset.closure(hypo, depth=depth)
        return Entity(np.random.choice([*hypos]))

    def inherited_frames_iter(self, lu):
        ''' Iterator for all parent frames of a lexical unit '''
        frame = lu.frame
        while frame:
            parentlist = [fr for fr in frame.frameRelations if fr.type.ID == 1 and fr.Child == frame]
            if parentlist:
                frame = parentlist[0].Parent
                yield frame
            else:
                frame = None

    def inherited_frame_relations_iter(self, lu):
        ''' Iterator of relations on this lexical unit's frame as well as its parents' '''
        for parent in self.inherited_frames_iter(lu):
            frs = [fr for fr in parent.frameRelations if fr.type.ID != 1]
            yield parent, frs

    def gen_lemma(self, weighted_by_freq: bool = True):
        return util.pick_random_lemma(self.synset, weighted_by_freq)
    
    def gen_cohyponym(
        self,
        part,
        weighted_by_freq=False,
        min_permissivity=1,
        max_permissivity=5,
        hypo_chance=0.3,
        debug=False,
    ):
        holonyms = []
        synset: Synset = part.synset
        permissivity = 0

        while permissivity < max_permissivity and (
            permissivity < min_permissivity or len(holonyms) == 0
        ):
            m = [*synset.closure(lambda s: s.part_holonyms())]
            logger.info(f"{len(m)}...{synset.name()}")
            holonyms.extend(m)
            permissivity += 1
            if len(holonyms) != 0:
                synset = np.random.choice(holonyms)
                hypos = [*synset.hyponyms()]
                if len(hypos) != 0 and np.random.rand() < hypo_chance:
                    synset = np.random.choice(hypos)
                    logger.info(f"/{synset.name()}")
            else:
                logger.info(f"reached root!")
                break
        return Entity(synset=synset)
    
    def gen_part(
        self,
        weighted_by_freq=False,
        min_permissivity=3,
        max_permissivity=10,
        hypo_chance=0.3,
        debug=False,
    ):
        meronyms: list[Synset] = []
        synset = self.synset
        permissivity = 0

        if weighted_by_freq:
            raise NotImplementedError("weighted_by_freq not implemented for gen_part")

        while permissivity < max_permissivity and (
            permissivity < min_permissivity or len(meronyms) == 0
        ):
            m: list[Synset] = [*synset.closure(lambda s: s.part_meronyms())]
            logger.info(f"{len(m)}...{synset.name()}")
            meronyms.extend(m)
            permissivity += 1
            synsets: list[Synset] = synset.hypernyms()
            if len(synsets) != 0:
                synset: Synset = np.random.choice(synsets)
                hypos: list[synset] = [*synset.hyponyms()]
                if len(hypos) != 0 and np.random.rand() < hypo_chance:
                    synset = np.random.choice(hypos)
                    logger.info(f"/{synset.name()}")
            else:
                logger.info(f"{fg.da_grey}reached root!")
                break

        logger.info(f"(num. meronyms:\t{len(meronyms)})")
        if len(meronyms) == 0:
            return None

        choice = np.random.choice(meronyms)
        logger.info(f"unweighted choice:\t{fg.da_yellow}{choice.name()}")
        return Entity(choice)

    def app(self, verb:str, src=None):
        verb_ss = util.get_synset(verb)
        if verb_ss is None:
            log.warning(f"No synset found for {verb}")
            return False
        lu = util.ss2lu(verb_ss)
        if lu is None:
            log.warning(f"No lu found for {verb}")
            return False
        self.active_frames.append((lu.frame))
        return True

    def describe(self):
        print(f"{self.name} is under the following states:")
        for frame in self.active_frames:
            print(frame.name)

def adj_from_root(synset: Synset, depth=1, weighted_by_freq=False):
    hypo = lambda s: s.hyponyms()
    hypos = synset.closure(hypo, depth=depth)
    return Entity(np.random.choice([*hypos]))
