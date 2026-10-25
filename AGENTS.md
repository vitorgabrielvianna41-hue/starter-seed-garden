# Project architecture
- Keep existing browser-local budget storage during this presentation-focused remodel; do not silently migrate users' records.
- Vehicle body templates and model choices live in the shared funilaria module, so checklist, budgets and PDF evidence use the same definitions.
- Compress user vehicle photos before storing them and reuse the shared PDF evidence appender in every export variant, so attachments survive all PDF choices.
- Voice budgeting uses browser speech recognition with a review step and typed fallback, so no private API key or new service is required.