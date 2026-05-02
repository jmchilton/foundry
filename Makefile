.PHONY: validate test typecheck fixtures fixtures-nextflow fixtures-iwc fixtures-skeletons fixtures-verify fixtures-clean

validate:
	npm run validate

test:
	npm run test

typecheck:
	npm run typecheck

fixtures:
	$(MAKE) -C workflow-fixtures all

fixtures-nextflow:
	$(MAKE) -C workflow-fixtures nextflow

fixtures-iwc:
	$(MAKE) -C workflow-fixtures iwc

fixtures-skeletons:
	$(MAKE) -C workflow-fixtures skeletons

fixtures-verify:
	$(MAKE) -C workflow-fixtures verify

fixtures-clean:
	$(MAKE) -C workflow-fixtures clean
