import numpy as np
from nltk.corpus import wordnet as wn
from nltk.corpus import framenet as fn
from sty import fg, bg, ef, rs
import logging

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, filename="arb.log", filemode="w")

def get_synset(name, pos=None, weighted_by_freq=False):
    '''Get a synset by name.
    Default behavior is to return the most frequent lemma'''
    synsets = wn.synsets(name, pos=pos)
    if len(synsets) == 0:
        return None
    freqs = np.array([ss_freq(ss) for ss in synsets], dtype=np.float64)
    freqs /= max(1, freqs.sum())
    log.info(f"get '{name}'")
    log.info(f"num. synsets: {len(synsets)}")
    log.info(f"freq max={max(freqs):.02f},avg={np.average(freqs):.02f}")
    if weighted_by_freq:
        synset = np.random.choice(synsets, p=freqs/sum(freqs))
    else:
        synset = synsets[np.argmax(freqs)]
    return synset

def lemma_frequencies(synset):
    '''Get the frequencies of lemmas in a synset'''
    lemmas = synset.lemmas()
    frequencies = np.array([l.count() for l in lemmas], dtype=np.float64)
    # normalize so we dont overflow on softmax
    frequencies /= max(1, frequencies.max())
    # softmax
    frequencies = np.exp(frequencies) / np.sum(np.exp(frequencies))
    return lemmas, frequencies
def wnpos2fnpos(wnpos):
    conv = {
        'n': 'n',
        'v': 'v',
        'a': 'a',
        's': 'a',
    }
    return conv[wnpos] if wnpos in conv else None

def ss2luname(lemma):
    '''Convert a wordnet lemma to a framenet lexical unit name'''
    pos = wnpos2fnpos(lemma.synset().pos())
    return f"{lemma.name()}.{pos}"
def ss2lu(synset):
    '''Convert a wordnet synset to a framenet lexical unit'''
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
    '''Get the frequency of a synset'''
    return sum(l.count() for l in synset.lemmas())

# def ss2lu(synset):
#     '''Convert a wordnet synset to a framenet lexical unit'''
#     lemmas = sorted((l, f) for f, l in zip(*lemma_frequencies(synset)))
#     i = 0
#     for _, lemma in lemmas:
#         name = f"{lemma.name()}.{synset.pos()}"
#         for lu in fn.lus(lemma.name()):
#             print(f"{fg.da_grey}lemma={name}, lu={lu.name}{fg.rs}")
#             i += 1
#             if lu.name == name:
#                 print(f"{fg.da_grey}found {name} in {i} iterations{fg.rs}")
#                 return lu
#     print(f"{fg.da_red}could not find {name} in {i} iterations, trying hypernym{fg.rs}")
#     hyper = synset.hypernyms()
#     if len(hyper) > 0:
#         return ss2lu(hyper[0])
#     return None

# def lemma_frequencies(synset):
#     '''Get the frequencies of lemmas in a synset'''
#     lemmas = synset.lemmas()
#     frequencies = np.array([l.count() for l in lemmas], dtype=np.float64)
#     # normalize so we dont overflow on softmax
#     frequencies /= max(1, frequencies.max())
#     # softmax
#     frequencies = np.exp(frequencies) / np.sum(np.exp(frequencies))
#     return lemmas, frequencies

def pick_random_lemma(synset, weighted_by_freq=True):
    '''Pick a random lemma from a synset'''
    if weighted_by_freq:
        lemmas, p = lemma_frequencies(synset)
        return np.random.choice(lemmas, p=p)
    else:
        return np.random.choice([*synset.lemmas()])
