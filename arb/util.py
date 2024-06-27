import numpy as np
from nltk.corpus import wordnet as wn
from nltk.corpus import framenet as fn
from sty import fg, bg, ef, rs

def ss2lu(synset):
    '''Convert a wordnet synset to a framenet lexical unit'''
    lemmas = sorted((l, f) for f, l in zip(*lemma_frequencies(synset)))
    i = 0
    for _, lemma in lemmas:
        name = f"{lemma.name()}.{synset.pos()}"
        for lu in fn.lus(lemma.name()):
            print(f"{fg.da_grey}lemma={name}, lu={lu.name}{fg.rs}")
            i += 1
            if lu.name == name:
                print(f"{fg.da_grey}found {name} in {i} iterations{fg.rs}")
                return lu
    print(f"{fg.da_red}could not find {name} in {i} iterations, trying hypernym{fg.rs}")
    hyper = synset.hypernyms()
    if len(hyper) > 0:
        return ss2lu(hyper[0])
    return None

def lemma_frequencies(synset):
    '''Get the frequencies of lemmas in a synset'''
    lemmas = synset.lemmas()
    frequencies = np.array([l.count() for l in lemmas], dtype=np.float64)
    # normalize so we dont overflow on softmax
    frequencies /= max(1, frequencies.max())
    # softmax
    frequencies = np.exp(frequencies) / np.sum(np.exp(frequencies))
    return lemmas, frequencies

def pick_random_lemma(synset, weighted_by_freq=True):
    '''Pick a random lemma from a synset'''
    if weighted_by_freq:
        lemmas, p = lemma_frequencies(synset)
        return np.random.choice(lemmas, p=p)
    else:
        return np.random.choice([*synset.lemmas()])
