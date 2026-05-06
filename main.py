import numpy as np
import textstat
import spacy
from sentence_transformers import SentenceTransformer, util


# Load tools once when the program starts.
# spaCy: splits text into sentences and words.
# SentenceTransformer: checks meaning similarity between sentences.
nlp = spacy.load("en_core_web_sm")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


# Core programming terms usually need explanation for learners.
CORE_PROGRAMMING_TERMS = [
    "variable",
    "loop",
    "function",
    "method",
    "array",
    "list",
    "condition",
    "class",
    "object",
    "exception",
    "error",
    "parameter",
    "argument",
    "return",
    "counter",
    "iteration",
    "boolean",
    "string",
    "integer",
]


# Basic/action terms are programming-related,
# but they usually do not require heavy explanation in short summaries.
BASIC_PROGRAMMING_TERMS = [
    "print",
    "output",
    "input",
    "code",
    "program",
    "value",
    "result",
]


EXPLANATION_PATTERNS = [
    "means",
    "mean",
    "which means",
    "refers to",
    "used to",
    "used for",
    "allows",
    "helps",
    "stores",
    "represents",
    "is a",
    "is an",
    "for example",
    "such as",
    "in other words",
]


def extract_clarity_features(text: str) -> dict:
    """
    Extract clarity-related features from a programming education summary transcript.

    This function extracts measurable indicators that help us calculate Clarity.
    """

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    doc = nlp(text)

    # Split text into sentences.
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    # Count only alphabetic words.
    words = [token for token in doc if token.is_alpha]

    sentence_count = len(sentences)
    word_count = len(words)

    # 1) Readability features
    flesch_reading_ease = textstat.flesch_reading_ease(text)
    coleman_liau_index = textstat.coleman_liau_index(text)
    dale_chall_score = textstat.dale_chall_readability_score(text)

    # 2) Sentence simplicity feature
    avg_sentence_words = word_count / max(1, sentence_count)

    # 3) Transcript hygiene feature
    # Temporarily disabled because grammar checking needs Java.
    grammar_issues_per_100_words = 0.0

    # 4) Basic semantic cohesion feature
    if sentence_count >= 2:
        embeddings = embedder.encode(sentences, normalize_embeddings=True)

        similarities = [
            float(util.cos_sim(embeddings[i], embeddings[i + 1]))
            for i in range(len(embeddings) - 1)
        ]

        adjacent_similarity_mean = float(np.mean(similarities))
        abrupt_shift_count = sum(sim < 0.35 for sim in similarities)
    else:
        adjacent_similarity_mean = 1.0
        abrupt_shift_count = 0

    # 5) Transition words feature
    transition_words = [
        "first",
        "second",
        "third",
        "then",
        "next",
        "finally",
        "because",
        "therefore",
        "so",
        "after that",
        "before that",
        "for example",
        "in this case",
        "as a result",
    ]

    text_lower = text.lower()

    transition_count = sum(
        text_lower.count(word)
        for word in transition_words
    )

    transition_density = transition_count / max(1, sentence_count)

    # 6) Concept explanation feature
    concept_features = extract_concept_explanation_features(text, sentences)

    return {
        "sentence_count": sentence_count,
        "word_count": word_count,
        "flesch_reading_ease": flesch_reading_ease,
        "coleman_liau_index": coleman_liau_index,
        "dale_chall_score": dale_chall_score,
        "avg_sentence_words": avg_sentence_words,
        "grammar_issues_per_100_words": grammar_issues_per_100_words,
        "adjacent_similarity_mean": adjacent_similarity_mean,
        "abrupt_shift_count": abrupt_shift_count,
        "transition_count": transition_count,
        "transition_density": transition_density,

        # Concept explanation details
        "core_terms_found": concept_features["core_terms_found"],
        "basic_terms_found": concept_features["basic_terms_found"],
        "all_programming_terms_found": concept_features["all_programming_terms_found"],
        "explained_core_terms": concept_features["explained_core_terms"],
        "unexplained_core_terms": concept_features["unexplained_core_terms"],
        "explained_basic_terms": concept_features["explained_basic_terms"],
        "unexplained_basic_terms": concept_features["unexplained_basic_terms"],
        "explained_core_terms_count": concept_features["explained_core_terms_count"],
        "unexplained_core_terms_count": concept_features["unexplained_core_terms_count"],
        "explained_basic_terms_count": concept_features["explained_basic_terms_count"],
        "unexplained_basic_terms_count": concept_features["unexplained_basic_terms_count"],
        "core_explanation_ratio": concept_features["core_explanation_ratio"],
        "basic_explanation_ratio": concept_features["basic_explanation_ratio"],
    }


def extract_concept_explanation_features(text: str, sentences: list) -> dict:
    """
    Detect programming terms and estimate whether they are explained.

    Better prototype rule:
    - Core terms affect the score strongly.
    - Basic terms are detected and reported, but they affect the score lightly.

    A term is considered explained if it appears in a sentence that also contains
    an explanation pattern such as:
    - means
    - used to
    - refers to
    - is a
    - for example
    """

    text_lower = text.lower()

    core_terms_found = [
        term for term in CORE_PROGRAMMING_TERMS
        if term in text_lower
    ]

    basic_terms_found = [
        term for term in BASIC_PROGRAMMING_TERMS
        if term in text_lower
    ]

    explained_core_terms = []
    unexplained_core_terms = []

    explained_basic_terms = []
    unexplained_basic_terms = []

    for term in core_terms_found:
        if is_term_explained(term, sentences):
            explained_core_terms.append(term)
        else:
            unexplained_core_terms.append(term)

    for term in basic_terms_found:
        if is_term_explained(term, sentences):
            explained_basic_terms.append(term)
        else:
            unexplained_basic_terms.append(term)

    explained_core_terms_count = len(explained_core_terms)
    unexplained_core_terms_count = len(unexplained_core_terms)

    explained_basic_terms_count = len(explained_basic_terms)
    unexplained_basic_terms_count = len(unexplained_basic_terms)

    core_explanation_ratio = explained_core_terms_count / max(1, len(core_terms_found))
    basic_explanation_ratio = explained_basic_terms_count / max(1, len(basic_terms_found))

    return {
        "core_terms_found": core_terms_found,
        "basic_terms_found": basic_terms_found,
        "all_programming_terms_found": core_terms_found + basic_terms_found,

        "explained_core_terms": explained_core_terms,
        "unexplained_core_terms": unexplained_core_terms,

        "explained_basic_terms": explained_basic_terms,
        "unexplained_basic_terms": unexplained_basic_terms,

        "explained_core_terms_count": explained_core_terms_count,
        "unexplained_core_terms_count": unexplained_core_terms_count,

        "explained_basic_terms_count": explained_basic_terms_count,
        "unexplained_basic_terms_count": unexplained_basic_terms_count,

        "core_explanation_ratio": core_explanation_ratio,
        "basic_explanation_ratio": basic_explanation_ratio,
    }


def is_term_explained(term: str, sentences: list) -> bool:
    """
    Check if a term appears in a sentence with an explanation pattern.
    """

    for sentence in sentences:
        sentence_lower = sentence.lower()

        if term in sentence_lower:
            has_explanation_pattern = any(
                pattern in sentence_lower
                for pattern in EXPLANATION_PATTERNS
            )

            if has_explanation_pattern:
                return True

    return False


def clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    """
    Keep any score between 0 and 100.
    """

    return max(min_value, min(value, max_value))


def score_readability(features: dict) -> float:
    """
    Convert readability indicators into a 0-100 score.

    Current simple version:
    We mainly use Flesch Reading Ease because it already works roughly on a 0-100 scale.
    Higher score = easier text.
    """

    flesch = features["flesch_reading_ease"]

    return clamp(flesch)


def score_sentence_simplicity(features: dict) -> float:
    """
    Score sentence simplicity based on average sentence length.

    Shorter sentences are usually easier to understand.
    """

    avg_words = features["avg_sentence_words"]

    if avg_words <= 12:
        return 100.0
    elif avg_words <= 18:
        return 80.0
    elif avg_words <= 25:
        return 60.0
    elif avg_words <= 35:
        return 40.0
    else:
        return 20.0


def score_cohesion(features: dict) -> float:
    """
    Score local flow between neighboring sentences.

    This version uses two signals:
    1. Semantic similarity between neighboring sentences.
    2. Transition words such as first, then, finally, because.
    """

    similarity = features["adjacent_similarity_mean"]
    abrupt_shifts = features["abrupt_shift_count"]
    transition_density = features["transition_density"]

    semantic_score = similarity * 100
    transition_score = clamp(transition_density * 100)

    # Transition words get slightly more weight because programming explanations are procedural.
    base_score = (0.45 * semantic_score) + (0.55 * transition_score)

    penalty = abrupt_shifts * 15

    return clamp(base_score - penalty)


def score_hygiene(features: dict) -> float:
    """
    Score transcript hygiene.

    Current version:
    Grammar checker is disabled, so this usually returns 100.
    Later, we can connect LanguageTool after installing Java.
    """

    issues = features["grammar_issues_per_100_words"]

    return clamp(100 - (issues * 10))


def score_concept_explanation(features: dict) -> float:
    """
    Score whether programming concepts are explained.

    Core terms are weighted heavily.
    Basic terms are weighted lightly.

    If no terms are detected, we do not punish the summary.
    """

    core_terms = features["core_terms_found"]
    basic_terms = features["basic_terms_found"]

    if len(core_terms) == 0 and len(basic_terms) == 0:
        return 100.0

    core_ratio = features["core_explanation_ratio"]
    basic_ratio = features["basic_explanation_ratio"]

    # If no core terms exist, do not punish core explanation.
    core_score = 100.0 if len(core_terms) == 0 else core_ratio * 100

    # If no basic terms exist, do not punish basic explanation.
    basic_score = 100.0 if len(basic_terms) == 0 else basic_ratio * 100

    # Core terms matter much more than basic terms.
    final_concept_score = (0.85 * core_score) + (0.15 * basic_score)

    return clamp(final_concept_score)


def calculate_clarity_score(features: dict) -> dict:
    """
    Calculate Clarity Score from extracted features.

    Current prototype weights:
    - Readability: 20%
    - Sentence Simplicity: 20%
    - Cohesion: 25%
    - Hygiene: 15%
    - Concept Explanation: 20%

    Why Concept Explanation matters:
    Programming summaries can be short and readable but still unclear
    if they use technical terms without explaining them.
    """

    readability = score_readability(features)
    sentence_simplicity = score_sentence_simplicity(features)
    cohesion = score_cohesion(features)
    hygiene = score_hygiene(features)
    concept_explanation = score_concept_explanation(features)

    final_score = (
        0.20 * readability
        + 0.20 * sentence_simplicity
        + 0.25 * cohesion
        + 0.15 * hygiene
        + 0.20 * concept_explanation
    )

    return {
        "readability_score": round(readability, 2),
        "sentence_simplicity_score": round(sentence_simplicity, 2),
        "cohesion_score": round(cohesion, 2),
        "hygiene_score": round(hygiene, 2),
        "concept_explanation_score": round(concept_explanation, 2),
        "clarity_score": round(final_score, 2),
    }


def get_clarity_status(clarity_score: float) -> str:
    """
    Convert the numeric clarity score into a readable status label.
    """

    if clarity_score >= 85:
        return "Excellent clarity"
    elif clarity_score >= 70:
        return "Good clarity"
    elif clarity_score >= 55:
        return "Needs revision"
    else:
        return "Low clarity"


def interpret_clarity_result(features: dict, scores: dict) -> list:
    """
    Generate simple diagnostic feedback based on clarity features and scores.
    """

    notes = []

    clarity_score = scores["clarity_score"]

    if clarity_score >= 85:
        notes.append("Overall, the summary is very clear and easy to follow.")
    elif clarity_score >= 70:
        notes.append("Overall, the summary is clear enough for learning, but it can still be improved.")
    elif clarity_score >= 55:
        notes.append("Overall, the summary is understandable, but it needs revision before being used for learning.")
    else:
        notes.append("Overall, the summary is not clear enough and may confuse learners.")

    # Readability interpretation
    readability = scores["readability_score"]

    if readability >= 70:
        notes.append("Readability is good; the text is generally easy to read.")
    elif readability >= 50:
        notes.append("Readability is acceptable, but some sentences or words may be difficult.")
    else:
        notes.append("Readability is weak; the text may be too difficult for learners.")

    # Sentence simplicity interpretation
    avg_words = features["avg_sentence_words"]

    if avg_words <= 12:
        notes.append("Sentences are short and simple, which supports clarity.")
    elif avg_words <= 18:
        notes.append("Sentence length is acceptable, but a few sentences could be shorter.")
    else:
        notes.append("Sentences are too long; splitting them would improve clarity.")

    # Cohesion interpretation
    cohesion = scores["cohesion_score"]
    abrupt_shifts = features["abrupt_shift_count"]
    transition_count = features["transition_count"]

    if cohesion >= 70 and abrupt_shifts == 0:
        notes.append("The flow between sentences is strong, and the explanation is easy to follow.")
    elif cohesion >= 50:
        notes.append("The flow between sentences is acceptable, but transitions could be stronger.")
    else:
        notes.append("Cohesion is weak; the summary may need clearer transitions such as first, then, finally, or because.")

    if transition_count > 0:
        notes.append(f"The summary uses {transition_count} transition word(s), which helps organize the explanation.")
    else:
        notes.append("No clear transition words were detected; adding words like first, then, finally, or because may improve clarity.")

    if abrupt_shifts > 0:
        notes.append(f"{abrupt_shifts} possible abrupt topic shift(s) detected between neighboring sentences.")

    # Concept explanation interpretation
    core_terms = features["core_terms_found"]
    basic_terms = features["basic_terms_found"]

    explained_core_terms = features["explained_core_terms"]
    unexplained_core_terms = features["unexplained_core_terms"]

    explained_basic_terms = features["explained_basic_terms"]
    unexplained_basic_terms = features["unexplained_basic_terms"]

    concept_score = scores["concept_explanation_score"]

    if len(core_terms) == 0 and len(basic_terms) == 0:
        notes.append("No programming terms were detected, so concept explanation was not penalized.")
    else:
        if core_terms:
            notes.append(f"Core programming terms detected: {', '.join(core_terms)}.")

        if basic_terms:
            notes.append(f"Basic programming terms detected: {', '.join(basic_terms)}.")

        if concept_score >= 80:
            notes.append("Important programming concepts appear to be explained clearly.")
        elif concept_score >= 50:
            notes.append("Some important programming concepts are explained, but others may need clearer definitions.")
        else:
            notes.append("Many important programming concepts appear without clear explanations, which may reduce learner understanding.")

        if explained_core_terms:
            notes.append(f"Explained core terms: {', '.join(explained_core_terms)}.")

        if unexplained_core_terms:
            notes.append(f"Core terms that may need explanation: {', '.join(unexplained_core_terms)}.")

        if explained_basic_terms:
            notes.append(f"Explained basic terms: {', '.join(explained_basic_terms)}.")

        if unexplained_basic_terms:
            notes.append(
                f"Basic terms not explicitly explained: {', '.join(unexplained_basic_terms)}. "
                "These are reported but penalized lightly."
            )

    # Hygiene interpretation
    hygiene = scores["hygiene_score"]

    if hygiene >= 90:
        notes.append("Transcript hygiene looks good in the current prototype.")
    elif hygiene >= 70:
        notes.append("Transcript hygiene is acceptable, but grammar or formatting may need review.")
    else:
        notes.append("Transcript hygiene is weak; grammar, punctuation, or formatting should be improved.")

    notes.append("Note: Grammar checking is currently disabled, so hygiene is only a placeholder score.")
    notes.append("Note: Concept explanation is currently rule-based, so it is useful for prototyping but not perfect.")

    return notes


def print_results(features: dict, scores: dict, notes: list) -> None:
    """
    Print features, scores, and interpretation in a readable format.
    """

    print("\nClarity Features:")
    print("-----------------")
    for name, value in features.items():
        print(f"{name}: {value}")

    print("\nClarity Scores:")
    print("-----------------")
    for name, value in scores.items():
        print(f"{name}: {value}")

    print("\nFinal Result:")
    print("-----------------")
    print(f"Clarity Score = {scores['clarity_score']} / 100")
    print(f"Status = {get_clarity_status(scores['clarity_score'])}")

    print("\nInterpretation:")
    print("-----------------")
    for index, note in enumerate(notes, start=1):
        print(f"{index}. {note}")


def read_multiline_input() -> str:
    """
    Read a summary transcript from the user.

    The user can write or paste multiple lines.
    To finish input, type END on a new line.
    """

    print("\nPaste the summarized transcript below.")
    print("When you finish, type END on a new line.")
    print("----------------------------------------")

    lines = []

    while True:
        line = input()

        if line.strip().upper() == "END":
            break

        lines.append(line)

    return "\n".join(lines).strip()


if __name__ == "__main__":
    summary_text = read_multiline_input()

    if not summary_text:
        print("\nError: You did not enter any text.")
    else:
        features = extract_clarity_features(summary_text)
        scores = calculate_clarity_score(features)
        notes = interpret_clarity_result(features, scores)

        print_results(features, scores, notes)