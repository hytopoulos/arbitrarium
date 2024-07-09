import numpy as np
from nltk.corpus import wordnet as wn
from nltk.corpus.reader.wordnet import Synset, Lemma
from nltk.corpus import framenet as fn
import logging

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, filename="arb.log", filemode="w")


def query_framenet(phrase: str):
    if not phrase.isalnum():
        yield None
    else:
        yield from fn.lus(f'^{phrase}\\.n')


def fnet_from_id(id):
    return fn.lu(id)


def query_noun(lemma):
    fn_matches = {}

    for lem in wn.lemmas(lemma, pos="n"):
        lexical_distance = 0
        ss = lem.synset()
        while ss:
            name = ss.name().split(".")[0]
            matches = list(query_framenet(name))
            matches = filter(lambda m: m and m.get('ID') not in fn_matches.keys(), matches)
            if match := next(matches, None):
                fn_matches[match.get("ID")] = {
                    "fnid": match.get("ID"),
                    "wnid": ss.offset(),
                    "fnname": match.get("name"),
                    "wnname": ss.name(),
                    "lemma": lem.name(),
                    "definition": match.get("definition"),
                    "frequency": lem.count(),
                    "depth": lexical_distance
                }
                break
            ss = (ss.hypernyms() or [None])[0]
            lexical_distance += 1
    return sorted(fn_matches.values(), key=lambda m: m["depth"])


def get_synset(
    name: str, pos: str | None = None, weighted_by_freq: bool = False
) -> Synset | None:
    """Get a synset by name.
    Default behavior is to return the most frequent lemma"""
    synsets: list[Synset] = wn.synsets(lemma=name, pos=pos)
    if len(synsets) == 0:
        return None
    freqs = np.array([ss_freq(ss) for ss in synsets], dtype=np.float64)
    freqs /= max(1, freqs.sum())
    log.info(f"get '{name}'")
    log.info(f"num. synsets: {len(synsets)}")
    log.info(f"freq max={max(freqs):.02f},avg={np.average(freqs):.02f}")
    if weighted_by_freq:
        synset = np.random.choice(synsets, p=freqs / sum(freqs))
    else:
        synset = synsets[np.argmax(freqs)]
    return synset


def lemma_frequencies(synset):
    """Get the frequencies of lemmas in a synset"""
    lemmas: list[Lemma] = synset.lemmas()
    frequencies = np.array([l.count() for l in lemmas], dtype=np.float64)
    # normalize so we dont overflow on softmax
    frequencies /= max(1, frequencies.max())
    # softmax
    frequencies = np.exp(frequencies) / np.sum(np.exp(frequencies))
    return lemmas, frequencies


def wnpos2fnpos(wnpos):
    conv = {
        "n": "n",
        "v": "v",
        "a": "a",
        "s": "a",
    }
    return conv[wnpos] if wnpos in conv else None


def ss2luname(lemma):
    """Convert a wordnet lemma to a framenet lexical unit name"""
    pos = wnpos2fnpos(lemma.synset().pos())
    return f"{lemma.name()}.{pos}"


def ss2lu(synset):
    """Convert a wordnet synset to a framenet lexical unit"""
    lemmas, freqs = lemma_frequencies(synset)
    i = 1
    for freq, lemma in sorted(zip(freqs, lemmas), reverse=True):
        name = ss2luname(lemma)
        lus = fn.lus(name)
        if len(lus) == 0:
            log.info(f"fn: missing {name}")
        for lu in fn.lus(name):
            i += 1
            if lu.name == name:
                log.info(f"fn: {name} found")
                return lu
    log.warning(f"fn: missing {name} and all lemmas")
    hyper = synset.hypernyms()
    if len(hyper) > 0:
        return ss2lu(hyper[0])
    return None


def ss_freq(synset):
    """Get the frequency of a synset"""
    return sum(l.count() for l in synset.lemmas())


def pick_random_lemma(synset, weighted_by_freq=True) -> Lemma:
    """Pick a random lemma from a synset"""
    if weighted_by_freq:
        lemmas, p = lemma_frequencies(synset)
        return np.random.choice(lemmas, p=p)
    else:
        return np.random.choice([*synset.lemmas()])


def get_semtype_default(id):
    log.info(f"init {fn.semtype(id).name}")
    return 0
