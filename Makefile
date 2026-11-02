# Full pipeline. Each step is idempotent; fetch steps add a new raw snapshot.
fetch:
	cd scripts && python fetch_nobel.py && python build_curated.py && python fetch_wikidata.py
build:
	cd scripts && python build_curated.py && python make_insight_skeletons.py && python quality_checks.py && python export_web.py
web:
	cd scripts && python export_web.py
	cd web && npm ci && npm run build:github
test:
	python -m pytest -q
app:
	cd web && npm ci && npm run dev
all: fetch build test web
.PHONY: fetch build web test app all
