# Full pipeline. Each step is idempotent; fetch steps add a new raw snapshot.
fetch:
	cd scripts && python fetch_nobel.py && python build_curated.py && python fetch_wikidata.py
build:
	cd scripts && python build_curated.py && python make_insight_skeletons.py && python quality_checks.py
test:
	python -m pytest -q
app:
	streamlit run app/app.py
all: fetch build test
.PHONY: fetch build test app all
