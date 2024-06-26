from nltk.corpus.reader.wordnet import Lemma, Synset
import numpy as np
from sty import fg, bg, ef, rs

entities = []

class Entity:
    def __init__(self, synset: Synset):
        self.synset: Synset = synset
        self.name = self.gen_lemma().name().replace("_", " ")

    def gen_lemma(self, weighted_by_freq: bool = True):
        lemmas = [*self.synset.lemmas()]
        if weighted_by_freq:
            weights = np.array([l.count() for l in lemmas], dtype=np.float64)
            # normalize so we dont overflow on softmax
            weights /= max(1, weights.max())
            # softmax
            weights = np.exp(weights) / np.sum(np.exp(weights))
            return np.random.choice(lemmas, p=weights)
        else:
            return np.random.choice(lemmas)

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
            if debug:
                print(f"{fg.da_grey}{len(m)}...{synset.name()}{fg.rs}")
            holonyms.extend(m)
            permissivity += 1
            if len(holonyms) != 0:
                synset = np.random.choice(holonyms)
                hypos = [*synset.hyponyms()]
                if len(hypos) != 0 and np.random.rand() < hypo_chance:
                    synset = np.random.choice(hypos)
                    if debug:
                        print(f"{fg.da_grey}/{synset.name()}{fg.rs}")
            else:
                if debug:
                    print(f"{fg.da_grey}reached root!{fg.rs}")
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
            if debug:
                print(f"{fg.da_grey}{len(m)}...{synset.name()}{fg.rs}")
            meronyms.extend(m)
            permissivity += 1
            synsets: list[Synset] = synset.hypernyms()
            if len(synsets) != 0:
                synset: Synset = np.random.choice(synsets)
                hypos: list[synset] = [*synset.hyponyms()]
                if len(hypos) != 0 and np.random.rand() < hypo_chance:
                    synset = np.random.choice(hypos)
                    if debug:
                        print(f"{fg.da_grey}/{synset.name()}{fg.rs}")
            else:
                if debug:
                    print(f"{fg.da_grey}reached root!{fg.rs}")
                break

        if debug:
            print(f"{fg.da_green}num. meronyms:\t{len(meronyms)}{fg.rs}")
        if len(meronyms) == 0:
            return None

        choice = np.random.choice(meronyms)
        if debug:
            print(
                f"{fg.da_green}unweighted choice:\t{fg.da_yellow}{choice.name()}{fg.rs}"
            )
        return Entity(choice)


def from_root(synset: Synset, depth=1, weighted_by_freq=True):
    hypo = lambda s: s.hyponyms()
    hypos = synset.closure(hypo, depth=depth)
    return Entity(np.random.choice([*hypos]))


def adj_from_root(synset: Synset, depth=1, weighted_by_freq=False):
    hypo = lambda s: s.hyponyms()
    hypos = synset.closure(hypo, depth=depth)
    return Entity(np.random.choice([*hypos]))
