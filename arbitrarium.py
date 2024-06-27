from nltk.corpus import wordnet as wn
from arb.entity import Entity
from argparse import ArgumentParser
import nltk

def handle_args(args):
    if "init" in args:
        init()
    if "chat_synset" in args:
        chat()
    if "gen_part_synset" in args:
        gen_part_synset()
    if "gen_cohyponym_synset" in args:
        gen_cohyponym_synset()
    if "verb" in args:
        patient = Entity.from_name(args.verb_patient)
        if patient.app(args.verb):
            patient.describe()

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

def gen_part_synset():
    e = Entity.from_name(args.gen_part_synset)
    # e = Entity(wn.synset(args.gen_part_synset))
    print(e.gen_part(min_permissivity=args.min_permiss, debug=args.verbose).name)
def gen_cohyponym_synset():
    e = Entity.from_name(args.gen_cohyponym_synset)
    part = e.gen_part(min_permissivity=args.min_permiss, debug=args.verbose)
    cohyp = e.gen_cohyponym(part, min_permissivity=args.min_permiss, debug=args.verbose)
    if cohyp is not None:
        print(cohyp.name)

if __name__ == "__main__":
    parser = ArgumentParser()
    sp =  parser.add_subparsers()
    init = sp.add_parser("init")
    init.set_defaults(init=True)
    gen = sp.add_parser("gen")
    app: ArgumentParser = sp.add_parser("app")

    sp_test = sp.add_parser("chat")
    sp_test.add_argument("chat_synset", type=str)

    sp_gen = gen.add_subparsers()
    gen_part = sp_gen.add_parser("part")
    gen_part.add_argument("gen_part_synset", type=str)
    gen_part.add_argument("--min-permiss", type=int, default=3)
    gen_part.add_argument("-v", "--verbose", action="store_true")
    gen_cohyponym = sp_gen.add_parser("cohyponym")
    gen_cohyponym.add_argument("gen_cohyponym_synset", type=str)
    gen_cohyponym.add_argument("--min-permiss", type=int, default=3)
    gen_cohyponym.add_argument("-v", "--verbose", action="store_true")
    gen_cohyponym.add_argument("--min-distinction", type=int, default=3)

    sp_app = app.add_subparsers()
    app_verb = sp_app.add_parser("verb")
    app_verb.add_argument("verb", type=str)
    app_verb.add_argument("verb_patient", type=str)

    args = parser.parse_args()
    handle_args(args)
