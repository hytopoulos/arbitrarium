from nltk.corpus import wordnet as wn
from arb.entity import Entity
from argparse import ArgumentParser
import nltk
import numpy as np

def test_loop():
    entities = np.array([Entity.from_name("room")])

    while True:
        inp = input("\n> ")
        if " " in inp:
            cmd, *args = inp.split(" ")
        else:
            cmd = inp
            args = []

        match cmd:
            case "init":
                init()
            case "add":
                entities = np.append(entities, Entity.from_name(args[0]))
                print(f"Added {args[0]} to entities.")
            case "apply":
                possible_matches = [e for e in entities if e.name == args[1]]
                if len(possible_matches) > 0:
                    patient = possible_matches[0]
                    patient.app(args[0])
                    patient.describe()
            case "ls":
                print("Current entities:")
                for e in entities:
                    print(e.name)
            case "define":
                possible_matches = [e for e in entities if e.name == args[0]]
                if len(possible_matches) > 0:
                    print(possible_matches[0].synset.definition())
            case "describe":
                possible_matches = [e for e in entities if e.name == args[0]]
                if len(possible_matches) > 0:
                    possible_matches[0].describe()
            case "q":
                break
            case _:
                pass

def init():
    nltk.download('framenet_v17')
    nltk.download('wordnet')

def chat():
    e = Entity.from_name(args.chat_synset)
    print(f"Let me tell you about {e.name}.")
    print(f"Its described as {e.synset.definition()}")
    lem = e.gen_lemma()
    if lem is not None and lem.name() != e.name:
        print(f"{e.name} is also known as {lem.name()}.")
    part = e.gen_part(min_permissivity=3, hypo_chance=0.4, debug=True)
    if part is not None:
        cohyp = e.gen_cohyponym(part, min_permissivity=3, hypo_chance=1, debug=True)
        if cohyp is not None:
            print(f"Did you know that a {e.name} has a {part.name}, just like a {cohyp.name} does?")

if __name__ == "__main__":
    test_loop()
