from cveval.utils.parsers import match_label, try_json


def test_try_json_clean():
    assert try_json('{"a":1}') == {"a": 1}


def test_try_json_markdown_fence():
    assert try_json('```json\n{"a":1}\n```') == {"a": 1}


def test_try_json_extra_commentary():
    assert try_json('the answer is {"a":1} hope this helps') == {"a": 1}


def test_try_json_garbage():
    assert try_json("totally not json") is None


def test_match_label_hit():
    assert match_label("I think it is RAIN heavy", ["clean", "rain", "rain_heavy"]) == "rain"


def test_match_label_miss():
    assert match_label("nothing here", ["clean", "rain"], "unknown") == "unknown"
