from common import INSIGHTS
from insights_lib import hard_errors, load_cards, validate_card

GOOD = {
    "status": "מאושר", "idea_he": "רעיון", "method_he": "שיטה", "method_source": "https://example.org/a",
    "quote": "short quote here", "quote_source": "https://example.org/b", "takeaway_he": "יישום",
    "label": "הערכה", "bias_note": "הטיית בחירה",
}


def test_complete_card_is_ready():
    assert validate_card(GOOD) == []


def test_quote_over_15_words_is_a_hard_error():
    card = {**GOOD, "quote": " ".join(["w"] * 16)}
    assert "quote longer than 15 words" in hard_errors(card)


def test_missing_bias_or_label_blocks_ready():
    assert validate_card({**GOOD, "bias_note": ""})
    assert validate_card({**GOOD, "label": "דעה"})
    assert validate_card({**GOOD, "status": "טיוטה"})


def test_all_cards_in_repo_have_no_hard_errors():
    cards = load_cards(INSIGHTS)
    assert len(cards) >= 20
    for c in cards:
        assert hard_errors(c) == [], c["path"].name
        assert c["nobel_id"] and c["qid"], c["path"].name
