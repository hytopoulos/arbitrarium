import pickle
from nltk.corpus import wordnet as wn
from arb.entity import Entity
from argparse import ArgumentParser

# random_obj = entitorium.from_root(wn.synset("car.n.01"))
# random_obj_part = random_obj.gen_part()

# print(*random_dog.synset.closure(lambda s: s.part_meronyms()))

def handle_args(args):
    if "chat_synset" in args:
        e = Entity(wn.synset(args.chat_synset))
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
    if "gen_part_synset" in args:
        e = Entity(wn.synset(args.gen_part_synset))
        print(e.gen_part(min_permissivity=args.min_permiss, debug=args.verbose).name)
    if "gen_cohyponym_synset" in args:
        e = Entity(wn.synset(args.gen_cohyponym_synset))
        part = e.gen_part(min_permissivity=args.min_permiss, debug=args.verbose)
        cohyp = e.gen_cohyponym(part, min_permissivity=args.min_permiss, debug=args.verbose)
        if cohyp is not None:
            print(cohyp.name)

if __name__ == "__main__":
    parser = ArgumentParser()
    sp =  parser.add_subparsers()
    gen = sp.add_parser("gen")

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

    args = parser.parse_args()
    handle_args(args)
